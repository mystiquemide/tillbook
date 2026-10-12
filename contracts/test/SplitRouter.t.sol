// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Base} from "./utils/Base.t.sol";
import {SplitRouter} from "../src/SplitRouter.sol";
import {LenderPool} from "../src/LenderPool.sol";

contract SplitRouterTest is Base {
    function setUp() public override {
        super.setUp();
        _deposit(lender, 10_000 * ONE);
    }

    function test_constructor_wiresPoolAndToken() public view {
        assertEq(address(router.pool()), address(pool));
        assertEq(address(router.token()), address(usdc));
    }

    function test_constructor_revertsOnZeroPool() public {
        vm.expectRevert(SplitRouter.ZeroAddress.selector);
        new SplitRouter(LenderPool(address(0)));
    }

    function test_pay_noAdvanceAllToMerchant() public {
        _pay(customer, merchant, 100 * ONE);
        assertEq(usdc.balanceOf(merchant), 100 * ONE);
        assertEq(usdc.balanceOf(address(router)), 0);
    }

    function test_pay_withAdvanceSplits() public {
        _draw(merchant, 500 * ONE, 30 * ONE, 1_000);
        uint256 poolBefore = usdc.balanceOf(address(pool));
        _pay(customer, merchant, 100 * ONE);
        assertEq(usdc.balanceOf(merchant), 500 * ONE + 90 * ONE);
        assertEq(usdc.balanceOf(address(pool)) - poolBefore, 10 * ONE);
        assertEq(_owed(merchant), 520 * ONE);
    }

    function test_pay_skimCappedAtOwed() public {
        _draw(merchant, 100 * ONE, 6 * ONE, 5_000);
        _pay(customer, merchant, 1_000 * ONE);
        assertEq(_owed(merchant), 0);
        assertFalse(pool.advanceOf(merchant).active);
        assertEq(usdc.balanceOf(merchant), 100 * ONE + 1_000 * ONE - 106 * ONE);
    }

    function test_pay_stopsSkimmingAfterRepaid() public {
        _draw(merchant, 10 * ONE, 0, 5_000);
        _pay(customer, merchant, 20 * ONE);
        assertEq(_owed(merchant), 0);
        uint256 before = usdc.balanceOf(merchant);
        _pay(customer, merchant, 50 * ONE);
        assertEq(usdc.balanceOf(merchant) - before, 50 * ONE);
    }

    function test_pay_repeatedPaymentsRepayInFull() public {
        _draw(merchant, 500 * ONE, 30 * ONE, 1_000);
        for (uint256 i; i < 53; i++) {
            _pay(customer, merchant, 100 * ONE);
        }
        assertEq(_owed(merchant), 0);
        assertEq(pool.repaidCount(merchant), 1);
        assertEq(pool.totalAssets(), 10_030 * ONE);
    }

    function test_pay_tinyAmountRoundsSkimToZero() public {
        _draw(merchant, 100 * ONE, 6 * ONE, 1_000);
        _pay(customer, merchant, 9);
        assertEq(_owed(merchant), 106 * ONE);
        assertEq(usdc.balanceOf(merchant), 100 * ONE + 9);
    }

    function test_pay_emitsPayment() public {
        _draw(merchant, 500 * ONE, 30 * ONE, 1_000);
        vm.expectEmit(true, true, false, true, address(router));
        emit SplitRouter.Payment(merchant, customer, 100 * ONE, 10 * ONE, bytes32("order"));
        _pay(customer, merchant, 100 * ONE);
    }

    function test_pay_emitsRepaidFromPoolWithRouterAsPayer() public {
        _draw(merchant, 500 * ONE, 30 * ONE, 1_000);
        vm.expectEmit(true, true, false, true, address(pool));
        emit LenderPool.Repaid(merchant, address(router), 10 * ONE, 520 * ONE);
        _pay(customer, merchant, 100 * ONE);
    }

    function test_pay_revertsOnZeroAmount() public {
        vm.prank(customer);
        vm.expectRevert(SplitRouter.ZeroAmount.selector);
        router.pay(merchant, 0, bytes32(0));
    }

    function test_pay_revertsOnZeroMerchant() public {
        vm.prank(customer);
        vm.expectRevert(SplitRouter.ZeroAddress.selector);
        router.pay(address(0), 1, bytes32(0));
    }

    function test_pay_revertsWithoutAllowance() public {
        address p = makeAddr("payer-no-allowance");
        usdc.mint(p, 100 * ONE);
        vm.prank(p);
        vm.expectRevert();
        router.pay(merchant, 10 * ONE, bytes32(0));
    }

    function test_pay_revertsWithoutBalance() public {
        address p = makeAddr("payer-broke");
        vm.prank(p);
        usdc.approve(address(router), type(uint256).max);
        vm.prank(p);
        vm.expectRevert();
        router.pay(merchant, 10 * ONE, bytes32(0));
    }

    function test_pay_routerKeepsNoBalanceOrAllowance() public {
        _draw(merchant, 500 * ONE, 30 * ONE, 1_000);
        _pay(customer, merchant, 77 * ONE);
        assertEq(usdc.balanceOf(address(router)), 0);
        assertEq(usdc.allowance(address(router), address(pool)), 0);
    }

    function test_pay_merchantPayingThemselves() public {
        _draw(merchant, 100 * ONE, 6 * ONE, 1_000);
        vm.prank(merchant);
        usdc.approve(address(router), type(uint256).max);
        _pay(merchant, merchant, 50 * ONE);
        assertEq(_owed(merchant), 101 * ONE);
        assertEq(usdc.balanceOf(merchant), 95 * ONE);
    }

    function test_pay_otherMerchantUnaffected() public {
        _draw(merchant, 100 * ONE, 6 * ONE, 1_000);
        _pay(customer, merchant2, 100 * ONE);
        assertEq(usdc.balanceOf(merchant2), 100 * ONE);
        assertEq(_owed(merchant), 106 * ONE);
    }

    function test_quote_matchesPay() public {
        _draw(merchant, 500 * ONE, 30 * ONE, 2_500);
        (uint256 toPool, uint256 toMerchant) = router.quote(merchant, 123_456_789);
        uint256 mBefore = usdc.balanceOf(merchant);
        _pay(customer, merchant, 123_456_789);
        assertEq(usdc.balanceOf(merchant) - mBefore, toMerchant);
        assertEq(530 * ONE - _owed(merchant), toPool);
    }

    function test_quote_noAdvance() public view {
        (uint256 toPool, uint256 toMerchant) = router.quote(merchant, 100 * ONE);
        assertEq(toPool, 0);
        assertEq(toMerchant, 100 * ONE);
    }

    function test_fullCycle_payDrawRepayBorrowMore() public {
        _draw(merchant, 200 * ONE, 12 * ONE, 1_000);
        for (uint256 i; i < 22; i++) {
            _pay(customer, merchant, 100 * ONE);
        }
        assertEq(pool.repaidCount(merchant), 1);
        _draw(merchant, 400 * ONE, 24 * ONE, 1_000);
        assertEq(pool.advanceOf(merchant).owed, 424 * ONE);
        assertEq(pool.nonces(merchant), 2);
    }
}
