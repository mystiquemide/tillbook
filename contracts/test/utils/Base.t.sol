// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {LenderPool} from "../../src/LenderPool.sol";
import {SplitRouter} from "../../src/SplitRouter.sol";
import {MockUSDC} from "../mocks/MockUSDC.sol";

abstract contract Base is Test {
    MockUSDC internal usdc;
    LenderPool internal pool;
    SplitRouter internal router;

    uint256 internal underwriterKey = 0xA11CE;
    address internal underwriter;

    address internal lender = makeAddr("lender");
    address internal lender2 = makeAddr("lender2");
    address internal merchant = makeAddr("merchant");
    address internal merchant2 = makeAddr("merchant2");
    address internal customer = makeAddr("customer");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant ONE = 1e6;

    function setUp() public virtual {
        underwriter = vm.addr(underwriterKey);
        usdc = new MockUSDC();
        pool = new LenderPool(usdc, underwriter);
        router = new SplitRouter(pool);

        address[4] memory funded = [lender, lender2, customer, stranger];
        for (uint256 i; i < funded.length; i++) {
            usdc.mint(funded[i], 1_000_000 * ONE);
            vm.prank(funded[i]);
            usdc.approve(address(pool), type(uint256).max);
            vm.prank(funded[i]);
            usdc.approve(address(router), type(uint256).max);
        }
        vm.prank(merchant);
        usdc.approve(address(pool), type(uint256).max);
    }

    function _deposit(address who, uint256 amount) internal returns (uint256 shares) {
        vm.prank(who);
        shares = pool.deposit(amount, who);
    }

    function _offer(address m, uint256 amount, uint256 fee, uint16 bps)
        internal
        view
        returns (LenderPool.Offer memory o)
    {
        o = LenderPool.Offer({
            merchant: m,
            amount: amount,
            fee: fee,
            holdbackBps: bps,
            nonce: pool.nonces(m),
            expiry: block.timestamp + 15 minutes
        });
    }

    function _sign(LenderPool.Offer memory o, uint256 key) internal view returns (bytes memory) {
        bytes32 digest = pool.hashOffer(o);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function _draw(address m, uint256 amount, uint256 fee, uint16 bps) internal returns (LenderPool.Offer memory o) {
        o = _offer(m, amount, fee, bps);
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(m);
        pool.requestAdvance(o, sig);
    }

    function _pay(address payer, address m, uint256 amount) internal {
        vm.prank(payer);
        router.pay(m, amount, bytes32("order"));
    }

    function _owed(address m) internal view returns (uint256 owed) {
        (owed,) = pool.holdbackOf(m);
    }
}
