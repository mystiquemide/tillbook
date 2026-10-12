// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Base} from "./utils/Base.t.sol";
import {LenderPool} from "../src/LenderPool.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract LenderPoolTest is Base {
    // ------------------------------------------------------------ construction

    function test_constructor_setsUnderwriterAndAsset() public view {
        assertEq(pool.underwriter(), underwriter);
        assertEq(pool.asset(), address(usdc));
        assertEq(pool.name(), "Tillbook Pool Share");
        assertEq(pool.symbol(), "tbUSDC");
    }

    function test_constructor_shareDecimalsOffset() public view {
        assertEq(pool.decimals(), 12);
    }

    function test_constructor_revertsOnZeroUnderwriter() public {
        vm.expectRevert(LenderPool.ZeroAddress.selector);
        new LenderPool(usdc, address(0));
    }

    function test_constructor_revertsOnZeroAsset() public {
        vm.expectRevert();
        new LenderPool(IERC20(address(0)), underwriter);
    }

    function test_initialState() public view {
        assertEq(pool.totalAssets(), 0);
        assertEq(pool.totalSupply(), 0);
        assertEq(pool.principalOutstanding(), 0);
        assertEq(pool.idle(), 0);
        assertEq(pool.nonces(merchant), 0);
        assertEq(pool.repaidCount(merchant), 0);
    }

    // ------------------------------------------------------------ deposits & withdrawals

    function test_deposit_mintsShares() public {
        uint256 shares = _deposit(lender, 1_000 * ONE);
        assertEq(pool.balanceOf(lender), shares);
        assertEq(pool.totalAssets(), 1_000 * ONE);
        assertEq(pool.idle(), 1_000 * ONE);
        assertGt(shares, 0);
    }

    function test_deposit_twoLendersSamePrice() public {
        uint256 s1 = _deposit(lender, 500 * ONE);
        uint256 s2 = _deposit(lender2, 500 * ONE);
        assertEq(s1, s2);
    }

    function test_withdraw_fullWhenIdle() public {
        _deposit(lender, 1_000 * ONE);
        uint256 before = usdc.balanceOf(lender);
        vm.prank(lender);
        pool.withdraw(1_000 * ONE, lender, lender);
        assertEq(usdc.balanceOf(lender) - before, 1_000 * ONE);
        assertEq(pool.balanceOf(lender), 0);
    }

    function test_redeem_fullWhenIdle() public {
        uint256 shares = _deposit(lender, 1_000 * ONE);
        vm.prank(lender);
        uint256 assets = pool.redeem(shares, lender, lender);
        assertEq(assets, 1_000 * ONE);
    }

    function test_maxWithdraw_limitedToIdle() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 600 * ONE, 36 * ONE, 1_000);
        assertEq(pool.idle(), 400 * ONE);
        assertEq(pool.maxWithdraw(lender), 400 * ONE);
    }

    function test_maxRedeem_limitedToIdle() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 600 * ONE, 36 * ONE, 1_000);
        uint256 maxShares = pool.maxRedeem(lender);
        assertLe(pool.previewRedeem(maxShares), 400 * ONE);
        assertLt(maxShares, pool.balanceOf(lender));
    }

    function test_withdraw_revertsAboveIdle() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 600 * ONE, 36 * ONE, 1_000);
        vm.prank(lender);
        vm.expectRevert(abi.encodeWithSelector(ERC4626.ERC4626ExceededMaxWithdraw.selector, lender, 401 * ONE, 400 * ONE));
        pool.withdraw(401 * ONE, lender, lender);
    }

    function test_redeem_revertsAboveIdle() public {
        uint256 shares = _deposit(lender, 1_000 * ONE);
        _draw(merchant, 600 * ONE, 36 * ONE, 1_000);
        vm.prank(lender);
        vm.expectRevert();
        pool.redeem(shares, lender, lender);
    }

    function test_withdraw_idlePartWhileLent() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 600 * ONE, 36 * ONE, 1_000);
        vm.prank(lender);
        pool.withdraw(400 * ONE, lender, lender);
        assertEq(pool.idle(), 0);
        assertEq(pool.totalAssets(), 600 * ONE);
    }

    function test_maxWithdraw_zeroForNonHolder() public {
        _deposit(lender, 1_000 * ONE);
        assertEq(pool.maxWithdraw(stranger), 0);
        assertEq(pool.maxRedeem(stranger), 0);
    }

    function test_withdraw_byApprovedSpender() public {
        uint256 shares = _deposit(lender, 1_000 * ONE);
        vm.prank(lender);
        pool.approve(stranger, shares);
        vm.prank(stranger);
        pool.withdraw(100 * ONE, stranger, lender);
        assertEq(usdc.balanceOf(stranger), 1_000_000 * ONE + 100 * ONE);
    }

    function test_withdraw_revertsForUnapprovedSpender() public {
        _deposit(lender, 1_000 * ONE);
        vm.prank(stranger);
        vm.expectRevert();
        pool.withdraw(100 * ONE, stranger, lender);
    }

    // ------------------------------------------------------------ requestAdvance happy path

    function test_requestAdvance_transfersAndRecords() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 500 * ONE, 30 * ONE, 1_000);

        assertEq(usdc.balanceOf(merchant), 500 * ONE);
        LenderPool.Advance memory a = pool.advanceOf(merchant);
        assertEq(a.owed, 530 * ONE);
        assertEq(a.principal, 500 * ONE);
        assertEq(a.holdbackBps, 1_000);
        assertTrue(a.active);
        assertEq(pool.principalOutstanding(), 500 * ONE);
        assertEq(pool.nonces(merchant), 1);
    }

    function test_requestAdvance_totalAssetsUnchangedAtDraw() public {
        _deposit(lender, 1_000 * ONE);
        uint256 before = pool.totalAssets();
        _draw(merchant, 500 * ONE, 30 * ONE, 1_000);
        assertEq(pool.totalAssets(), before, "fee must not be recognized at draw");
    }

    function test_requestAdvance_emitsEvent() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 500 * ONE, 30 * ONE, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        vm.expectEmit(true, false, false, true, address(pool));
        emit LenderPool.AdvanceDrawn(merchant, 500 * ONE, 30 * ONE, 1_000, 0);
        vm.prank(merchant);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_zeroFeeAllowed() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 500 * ONE, 0, 1_000);
        assertEq(pool.advanceOf(merchant).owed, 500 * ONE);
    }

    function test_requestAdvance_feeEqualAmountAllowed() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 100 * ONE, 100 * ONE, 1_000);
        assertEq(pool.advanceOf(merchant).owed, 200 * ONE);
    }

    function test_requestAdvance_maxHoldbackAllowed() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 100 * ONE, 6 * ONE, 5_000);
        assertEq(pool.advanceOf(merchant).holdbackBps, 5_000);
    }

    function test_requestAdvance_exactlyIdleAllowed() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 1_000 * ONE, 60 * ONE, 1_000);
        assertEq(pool.idle(), 0);
    }

    function test_requestAdvance_atExpiryAllowed() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        vm.warp(o.expiry);
        vm.prank(merchant);
        pool.requestAdvance(o, sig);
        assertTrue(pool.advanceOf(merchant).active);
    }

    function test_requestAdvance_twoMerchantsIndependent() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 300 * ONE, 18 * ONE, 1_000);
        _draw(merchant2, 300 * ONE, 18 * ONE, 2_000);
        assertEq(pool.principalOutstanding(), 600 * ONE);
        assertEq(pool.advanceOf(merchant2).holdbackBps, 2_000);
    }

    // ------------------------------------------------------------ requestAdvance rejections

    function test_requestAdvance_revertsIfCallerNotMerchant() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(stranger);
        vm.expectRevert(LenderPool.NotMerchant.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsIfUnderwriterCalls() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(underwriter);
        vm.expectRevert(LenderPool.NotMerchant.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsWhenExpired() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        vm.warp(o.expiry + 1);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.OfferExpired.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsOnReplay() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(merchant);
        pool.requestAdvance(o, sig);

        usdc.mint(merchant, 106 * ONE);
        vm.prank(merchant);
        pool.repay(merchant, 106 * ONE);

        vm.prank(merchant);
        vm.expectRevert(LenderPool.BadNonce.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsOnFutureNonce() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 1_000);
        o.nonce = 5;
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.BadNonce.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsOnWrongSigner() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 1_000);
        bytes memory sig = _sign(o, 0xBAD);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.BadSignature.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsOnMerchantSelfSigned() public {
        _deposit(lender, 1_000 * ONE);
        (address m, uint256 mKey) = makeAddrAndKey("selfsigner");
        LenderPool.Offer memory o = _offer(m, 100 * ONE, 6 * ONE, 1_000);
        bytes memory sig = _sign(o, mKey);
        vm.prank(m);
        vm.expectRevert(LenderPool.BadSignature.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsOnTamperedAmount() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        o.amount = 900 * ONE;
        vm.prank(merchant);
        vm.expectRevert(LenderPool.BadSignature.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsOnTamperedFee() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        o.fee = 0;
        vm.prank(merchant);
        vm.expectRevert(LenderPool.BadSignature.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsOnTamperedHoldback() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        o.holdbackBps = 1;
        vm.prank(merchant);
        vm.expectRevert(LenderPool.BadSignature.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsOnTamperedExpiry() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        o.expiry += 1 days;
        vm.prank(merchant);
        vm.expectRevert(LenderPool.BadSignature.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsOnOfferForOtherMerchant() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        o.merchant = merchant2;
        vm.prank(merchant2);
        vm.expectRevert(LenderPool.BadSignature.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsOnMalformedSignature() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 1_000);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.BadSignature.selector);
        pool.requestAdvance(o, hex"1234");
    }

    function test_requestAdvance_revertsOnEmptySignature() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 1_000);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.BadSignature.selector);
        pool.requestAdvance(o, "");
    }

    function test_requestAdvance_revertsOnHighSSignature() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 1_000);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(underwriterKey, pool.hashOffer(o));
        uint256 n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;
        bytes32 highS = bytes32(n - uint256(s));
        uint8 flippedV = v == 27 ? 28 : 27;
        vm.prank(merchant);
        vm.expectRevert(LenderPool.BadSignature.selector);
        pool.requestAdvance(o, abi.encodePacked(r, highS, flippedV));
    }

    function test_requestAdvance_revertsOnZeroAmount() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 0, 0, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.InvalidOffer.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsOnFeeAboveAmount() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 100 * ONE + 1, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.InvalidOffer.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsOnZeroHoldback() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 0);
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.InvalidOffer.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsOnHoldbackAboveMax() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 5_001);
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.InvalidOffer.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsOnUint128Overflow() public {
        LenderPool.Offer memory o = _offer(merchant, uint256(type(uint128).max), 1, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.InvalidOffer.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsWhenActive() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 100 * ONE, 6 * ONE, 1_000);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.AdvanceActive.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsAboveIdle() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 1_000 * ONE + 1, 6 * ONE, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.InsufficientLiquidity.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_revertsOnEmptyPool() public {
        LenderPool.Offer memory o = _offer(merchant, 1, 0, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.InsufficientLiquidity.selector);
        pool.requestAdvance(o, sig);
    }

    function test_requestAdvance_signatureNotValidOnOtherPool() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool other = new LenderPool(usdc, underwriter);
        vm.prank(lender);
        usdc.approve(address(other), type(uint256).max);
        vm.prank(lender);
        other.deposit(1_000 * ONE, lender);

        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.BadSignature.selector);
        other.requestAdvance(o, sig);
    }

    function test_requestAdvance_signatureNotValidOnOtherChain() public {
        _deposit(lender, 1_000 * ONE);
        LenderPool.Offer memory o = _offer(merchant, 100 * ONE, 6 * ONE, 1_000);
        bytes memory sig = _sign(o, underwriterKey);
        vm.chainId(999);
        vm.prank(merchant);
        vm.expectRevert(LenderPool.BadSignature.selector);
        pool.requestAdvance(o, sig);
    }

    // ------------------------------------------------------------ repay

    function test_repay_partialReducesOwedAndPrincipal() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 500 * ONE, 50 * ONE, 1_000);
        vm.prank(stranger);
        uint256 paid = pool.repay(merchant, 110 * ONE);
        assertEq(paid, 110 * ONE);
        LenderPool.Advance memory a = pool.advanceOf(merchant);
        assertEq(a.owed, 440 * ONE);
        assertEq(a.principal, 400 * ONE);
        assertEq(pool.principalOutstanding(), 400 * ONE);
        assertTrue(a.active);
    }

    function test_repay_feeAccruesToLendersProportionally() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 500 * ONE, 50 * ONE, 1_000);
        vm.prank(stranger);
        pool.repay(merchant, 110 * ONE);
        assertEq(pool.totalAssets(), 1_010 * ONE);
    }

    function test_repay_fullClosesAdvance() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 500 * ONE, 30 * ONE, 1_000);
        vm.prank(stranger);
        pool.repay(merchant, 530 * ONE);
        LenderPool.Advance memory a = pool.advanceOf(merchant);
        assertFalse(a.active);
        assertEq(a.owed, 0);
        assertEq(a.principal, 0);
        assertEq(a.holdbackBps, 0);
        assertEq(pool.repaidCount(merchant), 1);
        assertEq(pool.principalOutstanding(), 0);
        assertEq(pool.totalAssets(), 1_030 * ONE);
    }

    function test_repay_overpaymentCapped() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 500 * ONE, 30 * ONE, 1_000);
        uint256 before = usdc.balanceOf(stranger);
        vm.prank(stranger);
        uint256 paid = pool.repay(merchant, 10_000 * ONE);
        assertEq(paid, 530 * ONE);
        assertEq(before - usdc.balanceOf(stranger), 530 * ONE);
    }

    function test_repay_emitsEvents() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 100 * ONE, 6 * ONE, 1_000);
        vm.expectEmit(true, true, false, true, address(pool));
        emit LenderPool.Repaid(merchant, stranger, 106 * ONE, 0);
        vm.expectEmit(true, false, false, true, address(pool));
        emit LenderPool.AdvanceRepaid(merchant, 1);
        vm.prank(stranger);
        pool.repay(merchant, 106 * ONE);
    }

    function test_repay_revertsWithoutAdvance() public {
        vm.prank(stranger);
        vm.expectRevert(LenderPool.NoActiveAdvance.selector);
        pool.repay(merchant, 1);
    }

    function test_repay_revertsAfterClosed() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 100 * ONE, 6 * ONE, 1_000);
        vm.prank(stranger);
        pool.repay(merchant, 106 * ONE);
        vm.prank(stranger);
        vm.expectRevert(LenderPool.NoActiveAdvance.selector);
        pool.repay(merchant, 1);
    }

    function test_repay_revertsOnZero() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 100 * ONE, 6 * ONE, 1_000);
        vm.prank(stranger);
        vm.expectRevert(LenderPool.ZeroAmount.selector);
        pool.repay(merchant, 0);
    }

    function test_repay_revertsWithoutAllowance() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 100 * ONE, 6 * ONE, 1_000);
        address broke = makeAddr("noallowance");
        usdc.mint(broke, 1_000 * ONE);
        vm.prank(broke);
        vm.expectRevert();
        pool.repay(merchant, 10 * ONE);
    }

    function test_repay_byMerchantDirectly() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 100 * ONE, 6 * ONE, 1_000);
        usdc.mint(merchant, 6 * ONE);
        vm.prank(merchant);
        pool.repay(merchant, 106 * ONE);
        assertFalse(pool.advanceOf(merchant).active);
    }

    function test_repay_dustSteps() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 7, 3, 1_000);
        for (uint256 i; i < 10; i++) {
            vm.prank(stranger);
            pool.repay(merchant, 1);
        }
        assertFalse(pool.advanceOf(merchant).active);
        assertEq(pool.principalOutstanding(), 0);
    }

    function test_repay_canBorrowAgainAfterRepaid() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 100 * ONE, 6 * ONE, 1_000);
        vm.prank(stranger);
        pool.repay(merchant, 106 * ONE);
        _draw(merchant, 200 * ONE, 12 * ONE, 1_000);
        assertEq(pool.nonces(merchant), 2);
        assertEq(pool.advanceOf(merchant).owed, 212 * ONE);
    }

    function test_repay_countsIncrementPerCycle() public {
        _deposit(lender, 10_000 * ONE);
        for (uint256 i; i < 5; i++) {
            _draw(merchant, 100 * ONE, 6 * ONE, 1_000);
            vm.prank(stranger);
            pool.repay(merchant, 106 * ONE);
        }
        assertEq(pool.repaidCount(merchant), 5);
        assertEq(pool.totalAssets(), 10_030 * ONE);
    }

    // ------------------------------------------------------------ lender economics

    function test_lenderEarnsFee() public {
        uint256 shares = _deposit(lender, 1_000 * ONE);
        _draw(merchant, 500 * ONE, 30 * ONE, 1_000);
        vm.prank(stranger);
        pool.repay(merchant, 530 * ONE);
        vm.prank(lender);
        uint256 out = pool.redeem(shares, lender, lender);
        assertApproxEqAbs(out, 1_030 * ONE, 1);
    }

    function test_lateDepositorDoesNotCaptureEarnedFee() public {
        _deposit(lender, 1_000 * ONE);
        _draw(merchant, 500 * ONE, 30 * ONE, 1_000);
        vm.prank(stranger);
        pool.repay(merchant, 530 * ONE);

        uint256 s2 = _deposit(lender2, 1_000 * ONE);
        vm.prank(lender2);
        uint256 out = pool.redeem(s2, lender2, lender2);
        assertApproxEqAbs(out, 1_000 * ONE, 1);
    }

    function test_feeNotCapturableBySandwichingDraw() public {
        _deposit(lender, 1_000 * ONE);
        uint256 s2 = _deposit(lender2, 1_000 * ONE);
        _draw(merchant, 500 * ONE, 30 * ONE, 1_000);
        vm.prank(lender2);
        uint256 out = pool.redeem(s2, lender2, lender2);
        assertLe(out, 1_000 * ONE);
    }

    function test_donationRaisesSharePrice() public {
        uint256 shares = _deposit(lender, 1_000 * ONE);
        vm.prank(stranger);
        usdc.transfer(address(pool), 100 * ONE);
        assertEq(pool.previewRedeem(shares), 1_100 * ONE - 1);
    }

    function test_inflationAttackMitigated() public {
        vm.prank(stranger);
        pool.deposit(1, stranger);
        vm.prank(stranger);
        usdc.transfer(address(pool), 10_000 * ONE);
        uint256 shares = _deposit(lender, 1_000 * ONE);
        assertGt(shares, 0, "victim must receive shares");
        vm.prank(lender);
        uint256 out = pool.redeem(shares, lender, lender);
        assertGe(out, 999 * ONE, "victim loses at most dust");
    }
}
