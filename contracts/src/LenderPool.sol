// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Tillbook lender pool
/// @notice Lenders deposit USDC and receive shares. Merchants draw advances against
/// offers signed by the underwriter and repay them from their sales. Fees accrue to
/// lenders as repayments arrive. Lenders can only withdraw liquidity that is not lent out.
contract LenderPool is ERC4626, EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Offer {
        address merchant;
        uint256 amount;
        uint256 fee;
        uint16 holdbackBps;
        uint256 nonce;
        uint256 expiry;
    }

    struct Advance {
        uint128 owed; // principal + fee still to be repaid
        uint128 principal; // principal portion of `owed`
        uint16 holdbackBps;
        bool active;
    }

    bytes32 public constant OFFER_TYPEHASH =
        keccak256("Offer(address merchant,uint256 amount,uint256 fee,uint16 holdbackBps,uint256 nonce,uint256 expiry)");
    uint16 public constant MAX_HOLDBACK_BPS = 5_000;
    uint256 public constant BPS = 10_000;

    address public immutable underwriter;

    mapping(address => Advance) internal _advances;
    mapping(address => uint256) public nonces;
    mapping(address => uint256) public repaidCount;

    /// @notice Principal currently lent out across all active advances.
    uint256 public principalOutstanding;

    event AdvanceDrawn(address indexed merchant, uint256 amount, uint256 fee, uint16 holdbackBps, uint256 nonce);
    event Repaid(address indexed merchant, address indexed payer, uint256 amount, uint256 owedAfter);
    event AdvanceRepaid(address indexed merchant, uint256 repaidCount);

    error ZeroAddress();
    error NotMerchant();
    error OfferExpired();
    error BadNonce();
    error BadSignature();
    error AdvanceActive();
    error NoActiveAdvance();
    error InvalidOffer();
    error InsufficientLiquidity();
    error ZeroAmount();

    constructor(IERC20 asset_, address underwriter_)
        ERC20("Tillbook Pool Share", "tbUSDC")
        ERC4626(asset_)
        EIP712("Tillbook", "1")
    {
        if (address(asset_) == address(0) || underwriter_ == address(0)) revert ZeroAddress();
        underwriter = underwriter_;
    }

    // ---------------------------------------------------------------- views

    function advanceOf(address merchant) external view returns (Advance memory) {
        return _advances[merchant];
    }

    /// @notice Amount still owed and the holdback rate. Used by the SplitRouter.
    function holdbackOf(address merchant) external view returns (uint256 owed, uint16 holdbackBps) {
        Advance storage a = _advances[merchant];
        return (a.owed, a.holdbackBps);
    }

    /// @notice Liquidity not lent out.
    function idle() public view returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    function hashOffer(Offer calldata o) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(abi.encode(OFFER_TYPEHASH, o.merchant, o.amount, o.fee, o.holdbackBps, o.nonce, o.expiry))
        );
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // ---------------------------------------------------------------- ERC4626 overrides

    function totalAssets() public view override returns (uint256) {
        return idle() + principalOutstanding;
    }

    function maxWithdraw(address owner) public view override returns (uint256) {
        return Math.min(super.maxWithdraw(owner), idle());
    }

    function maxRedeem(address owner) public view override returns (uint256) {
        return Math.min(super.maxRedeem(owner), _convertToShares(idle(), Math.Rounding.Floor));
    }

    /// @dev Offsets share decimals to blunt first-depositor inflation attacks.
    function _decimalsOffset() internal pure override returns (uint8) {
        return 6;
    }

    // ---------------------------------------------------------------- advances

    /// @notice Draw an advance using an offer signed by the underwriter.
    function requestAdvance(Offer calldata o, bytes calldata signature) external nonReentrant {
        if (msg.sender != o.merchant) revert NotMerchant();
        if (block.timestamp > o.expiry) revert OfferExpired();
        if (o.nonce != nonces[o.merchant]) revert BadNonce();
        if (o.amount == 0 || o.fee > o.amount || o.holdbackBps == 0 || o.holdbackBps > MAX_HOLDBACK_BPS) {
            revert InvalidOffer();
        }
        if (o.amount + o.fee > type(uint128).max) revert InvalidOffer();
        if (_advances[o.merchant].active) revert AdvanceActive();

        (address signer, ECDSA.RecoverError err,) = ECDSA.tryRecover(hashOffer(o), signature);
        if (err != ECDSA.RecoverError.NoError || signer != underwriter) revert BadSignature();

        if (o.amount > idle()) revert InsufficientLiquidity();

        nonces[o.merchant] = o.nonce + 1;
        // Casts are safe: amount + fee is checked against type(uint128).max above.
        // forge-lint: disable-next-line(unsafe-typecast)
        _advances[o.merchant] = Advance({
            owed: uint128(o.amount + o.fee), principal: uint128(o.amount), holdbackBps: o.holdbackBps, active: true
        });
        principalOutstanding += o.amount;

        IERC20(asset()).safeTransfer(o.merchant, o.amount);
        emit AdvanceDrawn(o.merchant, o.amount, o.fee, o.holdbackBps, o.nonce);
    }

    /// @notice Repay part or all of a merchant's advance. Anyone can pay. Pulls at most what is owed.
    /// @return paid The amount actually taken from the caller.
    function repay(address merchant, uint256 amount) external nonReentrant returns (uint256 paid) {
        if (amount == 0) revert ZeroAmount();
        Advance storage a = _advances[merchant];
        if (!a.active) revert NoActiveAdvance();

        uint256 owed = a.owed;
        paid = amount < owed ? amount : owed;

        uint256 principalPart;
        if (paid == owed) {
            principalPart = a.principal;
        } else {
            principalPart = Math.mulDiv(paid, a.principal, owed);
        }

        // Casts are safe: both values are bounded by fields that are already uint128.
        // forge-lint: disable-next-line(unsafe-typecast)
        a.owed = uint128(owed - paid);
        // forge-lint: disable-next-line(unsafe-typecast)
        a.principal -= uint128(principalPart);
        principalOutstanding -= principalPart;

        IERC20(asset()).safeTransferFrom(msg.sender, address(this), paid);
        emit Repaid(merchant, msg.sender, paid, a.owed);

        if (a.owed == 0) {
            a.active = false;
            a.holdbackBps = 0;
            uint256 count = ++repaidCount[merchant];
            emit AdvanceRepaid(merchant, count);
        }
    }
}
