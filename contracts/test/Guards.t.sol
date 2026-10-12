// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Base} from "./utils/Base.t.sol";
import {LenderPool} from "../src/LenderPool.sol";
import {SplitRouter} from "../src/SplitRouter.sol";

/// @notice Limits that bound the damage of a leaked underwriter key or a mistaken payment.
contract GuardsTest is Base {
    uint256 internal constant CAP = 5_000e6;
    LenderPool internal capped;

    function setUp() public override {
        super.setUp();
        capped = new LenderPool(usdc, underwriter, CAP);
        vm.prank(lender);
        usdc.approve(address(capped), type(uint256).max);
        vm.prank(lender);
        capped.deposit(100_000e6, lender);
    }

    function _drawOn(LenderPool p, address m, uint256 amount) internal {
        LenderPool.Offer memory o = LenderPool.Offer(m, amount, 0, 1_000, p.nonces(m), block.timestamp + 900);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(underwriterKey, p.hashOffer(o));
        vm.prank(m);
        p.requestAdvance(o, abi.encodePacked(r, s, v));
    }

    function test_maxAdvance_isStored() public view {
        assertEq(capped.maxAdvance(), CAP);
    }

    function test_maxAdvance_zeroRejectedAtDeploy() public {
        vm.expectRevert(LenderPool.InvalidOffer.selector);
        new LenderPool(usdc, underwriter, 0);
    }

    function test_maxAdvance_exactCapAllowed() public {
        _drawOn(capped, merchant, CAP);
        assertEq(capped.advanceOf(merchant).principal, CAP);
    }

    function test_maxAdvance_aboveCapRejectedEvenWithValidSignature() public {
        LenderPool.Offer memory o = LenderPool.Offer(merchant, CAP + 1, 0, 1_000, 0, block.timestamp + 900);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(underwriterKey, capped.hashOffer(o));
        vm.prank(merchant);
        vm.expectRevert(LenderPool.AboveMaxAdvance.selector);
        capped.requestAdvance(o, abi.encodePacked(r, s, v));
    }

    function test_maxAdvance_leakedKeyBlastRadiusPerAddress() public {
        // A leaked key can still sign for fresh addresses, but each is capped.
        for (uint256 i; i < 3; i++) {
            _drawOn(capped, address(uint160(0xBEEF + i)), CAP);
        }
        assertEq(capped.principalOutstanding(), 3 * CAP);
        assertEq(capped.idle(), 100_000e6 - 3 * CAP);
    }

    function testFuzz_maxAdvance_neverExceeded(uint256 amount) public {
        amount = bound(amount, 1, 100_000e6);
        LenderPool.Offer memory o = LenderPool.Offer(merchant, amount, 0, 1_000, 0, block.timestamp + 900);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(underwriterKey, capped.hashOffer(o));
        vm.prank(merchant);
        if (amount > CAP) vm.expectRevert(LenderPool.AboveMaxAdvance.selector);
        capped.requestAdvance(o, abi.encodePacked(r, s, v));
        assertLe(capped.advanceOf(merchant).principal, CAP);
    }

    function test_router_rejectsPayingTheRouter() public {
        vm.prank(customer);
        vm.expectRevert(SplitRouter.InvalidMerchant.selector);
        router.pay(address(router), 1e6, bytes32(0));
    }

    function test_router_rejectsPayingThePool() public {
        vm.prank(customer);
        vm.expectRevert(SplitRouter.InvalidMerchant.selector);
        router.pay(address(pool), 1e6, bytes32(0));
    }

    function test_router_customerKeepsFundsOnRejectedPayment() public {
        uint256 before = usdc.balanceOf(customer);
        vm.prank(customer);
        vm.expectRevert(SplitRouter.InvalidMerchant.selector);
        router.pay(address(router), 1e6, bytes32(0));
        assertEq(usdc.balanceOf(customer), before);
    }

    function testFuzz_router_neverHoldsFunds(address m, uint256 amount) public {
        vm.assume(m != address(0) && m != address(router) && m != address(pool));
        amount = bound(amount, 1, 1_000_000e6);
        vm.prank(customer);
        router.pay(m, amount, bytes32(0));
        assertEq(usdc.balanceOf(address(router)), 0);
    }
}
