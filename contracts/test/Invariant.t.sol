// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {LenderPool} from "../src/LenderPool.sol";
import {SplitRouter} from "../src/SplitRouter.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

/// @dev Drives random sequences of deposits, withdrawals, draws, payments and repayments.
contract Handler is Test {
    MockUSDC public usdc;
    LenderPool public pool;
    SplitRouter public router;
    uint256 public underwriterKey;

    address[] public lenders;
    address[] public merchants;
    address public customer = makeAddr("inv-customer");

    uint256 public totalFeesCharged;
    uint256 public ghostDeposited;
    uint256 public ghostWithdrawn;

    constructor(MockUSDC usdc_, LenderPool pool_, SplitRouter router_, uint256 key) {
        usdc = usdc_;
        pool = pool_;
        router = router_;
        underwriterKey = key;
        for (uint256 i; i < 3; i++) {
            address l = makeAddr(string.concat("inv-lender", vm.toString(i)));
            lenders.push(l);
            vm.prank(l);
            usdc.approve(address(pool), type(uint256).max);
            merchants.push(makeAddr(string.concat("inv-merchant", vm.toString(i))));
        }
        vm.prank(customer);
        usdc.approve(address(router), type(uint256).max);
        vm.prank(customer);
        usdc.approve(address(pool), type(uint256).max);
    }

    function merchantCount() external view returns (uint256) {
        return merchants.length;
    }

    function deposit(uint256 who, uint256 amount) external {
        address l = lenders[who % lenders.length];
        amount = bound(amount, 1, 1_000_000e6);
        usdc.mint(l, amount);
        vm.prank(l);
        pool.deposit(amount, l);
        ghostDeposited += amount;
    }

    function withdraw(uint256 who, uint256 amount) external {
        address l = lenders[who % lenders.length];
        uint256 max = pool.maxWithdraw(l);
        if (max == 0) return;
        amount = bound(amount, 1, max);
        vm.prank(l);
        pool.withdraw(amount, l, l);
        ghostWithdrawn += amount;
    }

    function redeemMax(uint256 who) external {
        address l = lenders[who % lenders.length];
        uint256 s = pool.maxRedeem(l);
        if (s == 0) return;
        vm.prank(l);
        ghostWithdrawn += pool.redeem(s, l, l);
    }

    function draw(uint256 who, uint256 amount, uint256 feeBps, uint16 bps) external {
        address m = merchants[who % merchants.length];
        if (pool.advanceOf(m).active) return;
        uint256 idle = pool.idle();
        if (idle == 0) return;
        amount = bound(amount, 1, idle);
        uint256 fee = amount * bound(feeBps, 0, 2_000) / 10_000;
        uint16 b = uint16(bound(bps, 1, 5_000));
        LenderPool.Offer memory o = LenderPool.Offer({
            merchant: m,
            amount: amount,
            fee: fee,
            holdbackBps: b,
            nonce: pool.nonces(m),
            expiry: block.timestamp + 1 hours
        });
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(underwriterKey, pool.hashOffer(o));
        vm.prank(m);
        pool.requestAdvance(o, abi.encodePacked(r, s, v));
        totalFeesCharged += fee;
    }

    function pay(uint256 who, uint256 amount) external {
        address m = merchants[who % merchants.length];
        amount = bound(amount, 1, 100_000e6);
        usdc.mint(customer, amount);
        vm.prank(customer);
        router.pay(m, amount, bytes32(0));
    }

    function repay(uint256 who, uint256 amount) external {
        address m = merchants[who % merchants.length];
        (uint256 owed,) = pool.holdbackOf(m);
        if (owed == 0) return;
        amount = bound(amount, 1, owed * 2);
        usdc.mint(customer, amount);
        vm.prank(customer);
        pool.repay(m, amount);
    }

    function warp(uint256 secs) external {
        vm.warp(block.timestamp + bound(secs, 1, 30 days));
    }
}

contract InvariantTest is Test {
    MockUSDC internal usdc;
    LenderPool internal pool;
    SplitRouter internal router;
    Handler internal handler;
    uint256 internal constant KEY = 0xA11CE;

    function setUp() public {
        usdc = new MockUSDC();
        pool = new LenderPool(usdc, vm.addr(KEY), type(uint256).max);
        router = new SplitRouter(pool);
        handler = new Handler(usdc, pool, router, KEY);
        targetContract(address(handler));
    }

    function invariant_principalOutstandingMatchesAdvances() public view {
        uint256 sum;
        for (uint256 i; i < handler.merchantCount(); i++) {
            sum += pool.advanceOf(handler.merchants(i)).principal;
        }
        assertEq(pool.principalOutstanding(), sum);
    }

    function invariant_principalNeverAboveOwed() public view {
        for (uint256 i; i < handler.merchantCount(); i++) {
            LenderPool.Advance memory a = pool.advanceOf(handler.merchants(i));
            assertLe(a.principal, a.owed);
            if (!a.active) {
                assertEq(a.owed, 0);
                assertEq(a.principal, 0);
            }
        }
    }

    function invariant_totalAssetsIsIdlePlusOutstanding() public view {
        assertEq(pool.totalAssets(), usdc.balanceOf(address(pool)) + pool.principalOutstanding());
    }

    function invariant_routerHoldsNothing() public view {
        assertEq(usdc.balanceOf(address(router)), 0);
        assertEq(usdc.allowance(address(router), address(pool)), 0);
    }

    function invariant_lendersNeverExtractMoreThanDepositedPlusFees() public view {
        assertLe(handler.ghostWithdrawn(), handler.ghostDeposited() + handler.totalFeesCharged());
    }

    function invariant_maxWithdrawWithinIdle() public view {
        for (uint256 i; i < 3; i++) {
            assertLe(pool.maxWithdraw(handler.lenders(i)), pool.idle());
        }
    }

    function invariant_poolSolventAgainstShares() public view {
        if (pool.totalSupply() == 0) return;
        assertGe(pool.totalAssets() + 1, pool.convertToAssets(pool.totalSupply()));
    }
}
