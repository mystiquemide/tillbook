// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Base} from "./utils/Base.t.sol";
import {LenderPool} from "../src/LenderPool.sol";

contract FuzzTest is Base {
    uint256 internal constant POOL = 1_000_000 * ONE;

    function setUp() public override {
        super.setUp();
        usdc.mint(lender, POOL);
        _deposit(lender, POOL);
        usdc.mint(customer, 1e18);
    }

    function _bounds(uint256 amount, uint256 feeBps, uint16 bps)
        internal
        pure
        returns (uint256 a, uint256 f, uint16 b)
    {
        a = bound(amount, 1, POOL);
        f = a * bound(feeBps, 0, 10_000) / 10_000;
        b = uint16(bound(bps, 1, 5_000));
    }

    function testFuzz_split_conservesValue(uint256 amount, uint256 feeBps, uint16 bps, uint256 payment) public {
        (uint256 a, uint256 f, uint16 b) = _bounds(amount, feeBps, bps);
        _draw(merchant, a, f, b);
        payment = bound(payment, 1, 1e15);

        uint256 owedBefore = _owed(merchant);
        uint256 mBefore = usdc.balanceOf(merchant);
        uint256 pBefore = usdc.balanceOf(address(pool));
        uint256 cBefore = usdc.balanceOf(customer);

        _pay(customer, merchant, payment);

        uint256 toMerchant = usdc.balanceOf(merchant) - mBefore;
        uint256 toPool = usdc.balanceOf(address(pool)) - pBefore;
        assertEq(cBefore - usdc.balanceOf(customer), payment, "customer pays exactly");
        assertEq(toMerchant + toPool, payment, "nothing lost");
        assertEq(owedBefore - _owed(merchant), toPool, "pool share reduces debt");
        assertLe(toPool, payment * b / 10_000, "never above holdback");
        assertLe(toPool, owedBefore, "never above owed");
        assertEq(usdc.balanceOf(address(router)), 0);
    }

    function testFuzz_split_exactHoldbackWhenNotCapped(uint256 amount, uint16 bps, uint256 payment) public {
        uint256 a = bound(amount, 1_000 * ONE, POOL);
        uint16 b = uint16(bound(bps, 1, 5_000));
        _draw(merchant, a, 0, b);
        payment = bound(payment, 1, a);
        (uint256 toPool,) = router.quote(merchant, payment);
        assertEq(toPool, payment * b / 10_000);
    }

    function testFuzz_draw_recordsExactTerms(uint256 amount, uint256 feeBps, uint16 bps) public {
        (uint256 a, uint256 f, uint16 b) = _bounds(amount, feeBps, bps);
        _draw(merchant, a, f, b);
        LenderPool.Advance memory adv = pool.advanceOf(merchant);
        assertEq(adv.owed, a + f);
        assertEq(adv.principal, a);
        assertEq(adv.holdbackBps, b);
        assertEq(usdc.balanceOf(merchant), a);
        assertEq(pool.principalOutstanding(), a);
        assertEq(pool.totalAssets(), POOL);
    }

    function testFuzz_repay_neverOverpays(uint256 amount, uint256 feeBps, uint256 repayAmt) public {
        (uint256 a, uint256 f,) = _bounds(amount, feeBps, 1_000);
        _draw(merchant, a, f, 1_000);
        repayAmt = bound(repayAmt, 1, 1e15);
        uint256 before = usdc.balanceOf(customer);
        vm.prank(customer);
        uint256 paid = pool.repay(merchant, repayAmt);
        assertEq(before - usdc.balanceOf(customer), paid);
        assertLe(paid, a + f);
        assertEq(paid, repayAmt < a + f ? repayAmt : a + f);
    }

    function testFuzz_repay_principalNeverExceedsOwed(uint256 amount, uint256 feeBps, uint256[8] memory steps) public {
        (uint256 a, uint256 f,) = _bounds(amount, feeBps, 1_000);
        _draw(merchant, a, f, 1_000);
        for (uint256 i; i < steps.length; i++) {
            LenderPool.Advance memory adv = pool.advanceOf(merchant);
            if (!adv.active) break;
            uint256 s = bound(steps[i], 1, adv.owed);
            vm.prank(customer);
            pool.repay(merchant, s);
            adv = pool.advanceOf(merchant);
            assertLe(adv.principal, adv.owed);
            assertEq(pool.principalOutstanding(), adv.principal);
        }
    }

    function testFuzz_fullRepay_lenderGetsFee(uint256 amount, uint256 feeBps, uint256 chunks) public {
        (uint256 a, uint256 f,) = _bounds(amount, feeBps, 1_000);
        _draw(merchant, a, f, 1_000);
        chunks = bound(chunks, 1, 20);
        uint256 owed = a + f;
        uint256 piece = owed / chunks + 1;
        while (pool.advanceOf(merchant).active) {
            vm.prank(customer);
            pool.repay(merchant, piece);
        }
        assertEq(pool.principalOutstanding(), 0);
        assertEq(pool.totalAssets(), POOL + f);
        assertEq(pool.repaidCount(merchant), 1);
    }

    function testFuzz_paymentsRepayInExactCount(uint256 amount, uint16 bps, uint256 sale) public {
        uint256 a = bound(amount, ONE, 10_000 * ONE);
        uint16 b = uint16(bound(bps, 500, 5_000));
        uint256 owed = a + a * 6 / 100;
        // Keep the loop short: at most 500 payments per run.
        uint256 minSale = (owed / 500) * 10_000 / b + 1;
        sale = bound(sale, minSale, minSale * 20);
        _draw(merchant, a, a * 6 / 100, b);

        uint256 skim = sale * b / 10_000;
        uint256 expected = (owed + skim - 1) / skim;
        for (uint256 i = 1; i < expected; i++) {
            _pay(customer, merchant, sale);
            assertTrue(pool.advanceOf(merchant).active, "repaid too early");
        }
        _pay(customer, merchant, sale);
        assertFalse(pool.advanceOf(merchant).active, "not repaid on expected payment");
        assertEq(pool.principalOutstanding(), 0);
        assertEq(pool.repaidCount(merchant), 1);
    }

    function testFuzz_withdraw_neverExceedsIdle(uint256 amount, uint256 w) public {
        uint256 a = bound(amount, 1, POOL);
        _draw(merchant, a, 0, 1_000);
        assertEq(pool.maxWithdraw(lender), POOL - a);
        w = bound(w, 0, POOL);
        vm.prank(lender);
        if (w > POOL - a) {
            vm.expectRevert();
            pool.withdraw(w, lender, lender);
        } else {
            pool.withdraw(w, lender, lender);
            assertEq(pool.idle(), POOL - a - w);
        }
    }

    function testFuzz_maxRedeem_isRedeemable(uint256 amount) public {
        uint256 a = bound(amount, 0, POOL - 1);
        if (a > 0) _draw(merchant, a, 0, 1_000);
        uint256 m = pool.maxRedeem(lender);
        vm.prank(lender);
        uint256 out = pool.redeem(m, lender, lender);
        assertLe(out, POOL - a);
    }

    function testFuzz_badSigner_alwaysRejected(uint256 key, uint256 amount) public {
        key = bound(key, 1, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364140);
        vm.assume(key != underwriterKey);
        uint256 a = bound(amount, 1, POOL);
        LenderPool.Offer memory o = _offer(merchant, a, 0, 1_000);
        bytes memory sig = _sign(o, key);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.BadSignature.selector);
        pool.requestAdvance(o, sig);
    }

    function testFuzz_wrongCaller_alwaysRejected(address caller, uint256 amount) public {
        vm.assume(caller != merchant);
        uint256 a = bound(amount, 1, POOL);
        LenderPool.Offer memory o = _offer(merchant, a, 0, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(caller);
        vm.expectRevert(LenderPool.NotMerchant.selector);
        pool.requestAdvance(o, sig);
    }

    function testFuzz_expired_alwaysRejected(uint256 late) public {
        LenderPool.Offer memory o = _offer(merchant, ONE, 0, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        vm.warp(o.expiry + bound(late, 1, 3650 days));
        vm.prank(merchant);
        vm.expectRevert(LenderPool.OfferExpired.selector);
        pool.requestAdvance(o, sig);
    }

    function testFuzz_wrongNonce_alwaysRejected(uint256 nonce) public {
        vm.assume(nonce != 0);
        LenderPool.Offer memory o = _offer(merchant, ONE, 0, 1_000);
        o.nonce = nonce;
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.BadNonce.selector);
        pool.requestAdvance(o, sig);
    }

    function testFuzz_invalidHoldback_rejected(uint16 bps) public {
        vm.assume(bps == 0 || bps > 5_000);
        LenderPool.Offer memory o = _offer(merchant, ONE, 0, bps);
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.InvalidOffer.selector);
        pool.requestAdvance(o, sig);
    }

    function testFuzz_feeAboveAmount_rejected(uint256 amount, uint256 extra) public {
        uint256 a = bound(amount, 1, POOL);
        uint256 f = a + bound(extra, 1, POOL);
        LenderPool.Offer memory o = _offer(merchant, a, f, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.InvalidOffer.selector);
        pool.requestAdvance(o, sig);
    }

    function testFuzz_aboveIdle_rejected(uint256 extra) public {
        uint256 a = POOL + bound(extra, 1, 1e18);
        LenderPool.Offer memory o = _offer(merchant, a, 0, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.InsufficientLiquidity.selector);
        pool.requestAdvance(o, sig);
    }

    function testFuzz_sharePriceNeverDropsOnRepay(uint256 amount, uint256 feeBps, uint256 r) public {
        (uint256 a, uint256 f,) = _bounds(amount, feeBps, 1_000);
        _draw(merchant, a, f, 1_000);
        uint256 priceBefore = pool.convertToAssets(1e18);
        vm.prank(customer);
        pool.repay(merchant, bound(r, 1, a + f));
        assertGe(pool.convertToAssets(1e18), priceBefore);
    }

    function testFuzz_depositRedeemRoundTripNoProfit(uint256 amount) public {
        uint256 a = bound(amount, 1, 1e15);
        usdc.mint(lender2, a);
        uint256 s = _deposit(lender2, a);
        vm.prank(lender2);
        uint256 out = pool.redeem(s, lender2, lender2);
        assertLe(out, a);
    }
}
