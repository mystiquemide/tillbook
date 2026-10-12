// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {LenderPool} from "./LenderPool.sol";

/// @title Tillbook split router
/// @notice Customers pay merchants through this contract. When a merchant has an active
/// advance, a fixed share of each payment repays the pool in the same transaction.
/// The router holds no funds between calls and has no owner.
contract SplitRouter {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;

    IERC20 public immutable token;
    LenderPool public immutable pool;

    event Payment(address indexed merchant, address indexed payer, uint256 amount, uint256 repaid, bytes32 ref);

    error ZeroAddress();
    error ZeroAmount();
    error TokenMismatch();
    error InvalidMerchant();
    error RepayMismatch();

    constructor(LenderPool pool_) {
        if (address(pool_) == address(0)) revert ZeroAddress();
        pool = pool_;
        token = IERC20(pool_.asset());
        if (address(token) == address(0)) revert TokenMismatch();
    }

    /// @notice Share of `amount` that would go to the pool right now.
    function quote(address merchant, uint256 amount) public view returns (uint256 toPool, uint256 toMerchant) {
        (uint256 owed, uint16 bps) = pool.holdbackOf(merchant);
        toPool = amount * bps / BPS;
        if (toPool > owed) toPool = owed;
        toMerchant = amount - toPool;
    }

    /// @notice Pay `merchant` `amount` of the pool's token. `ref` is a free-form order reference.
    function pay(address merchant, uint256 amount, bytes32 ref) external {
        if (merchant == address(0)) revert ZeroAddress();
        if (merchant == address(this) || merchant == address(pool)) revert InvalidMerchant();
        if (amount == 0) revert ZeroAmount();

        (uint256 toPool, uint256 toMerchant) = quote(merchant, amount);

        if (toPool > 0) {
            token.safeTransferFrom(msg.sender, address(this), toPool);
            token.forceApprove(address(pool), toPool);
            if (pool.repay(merchant, toPool) != toPool) revert RepayMismatch();
        }
        if (toMerchant > 0) {
            token.safeTransferFrom(msg.sender, merchant, toMerchant);
        }

        emit Payment(merchant, msg.sender, amount, toPool, ref);
    }
}
