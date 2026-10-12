// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LenderPool} from "../../src/LenderPool.sol";
import {SplitRouter} from "../../src/SplitRouter.sol";
import {Deploy} from "../../script/Deploy.s.sol";

/// @notice Runs the full loop against the real USDC contract on a Monad mainnet fork.
/// Skipped unless MONAD_FORK=true (needs network access to the RPC).
contract MainnetForkTest is Test {
    IERC20 internal usdc;
    LenderPool internal pool;
    SplitRouter internal router;

    uint256 internal constant KEY = 0xA11CE;
    address internal lender = makeAddr("fork-lender");
    address internal merchant = makeAddr("fork-merchant");
    address internal customer = makeAddr("fork-customer");

    function setUp() public {
        if (!vm.envOr("MONAD_FORK", false)) vm.skip(true);
        vm.createSelectFork(vm.envOr("MONAD_RPC_URL", string("https://rpc.monad.xyz")));
        Deploy d = new Deploy();
        (pool, router) = d.deploy(d.MONAD_USDC(), vm.addr(KEY));
        usdc = IERC20(d.MONAD_USDC());

        deal(address(usdc), lender, 10_000e6);
        deal(address(usdc), customer, 20_000e6);
        vm.prank(lender);
        usdc.approve(address(pool), type(uint256).max);
        vm.prank(customer);
        usdc.approve(address(router), type(uint256).max);
    }

    function test_fork_fullLoopWithRealUsdc() public {
        vm.prank(lender);
        uint256 shares = pool.deposit(5_000e6, lender);

        LenderPool.Offer memory o = LenderPool.Offer(merchant, 1_000e6, 60e6, 1_000, 0, block.timestamp + 900);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(KEY, pool.hashOffer(o));
        vm.prank(merchant);
        pool.requestAdvance(o, abi.encodePacked(r, s, v));
        assertEq(usdc.balanceOf(merchant), 1_000e6);

        for (uint256 i; i < 106; i++) {
            vm.prank(customer);
            router.pay(merchant, 100e6, bytes32(i));
        }
        assertFalse(pool.advanceOf(merchant).active);
        assertEq(pool.repaidCount(merchant), 1);
        assertEq(usdc.balanceOf(address(router)), 0);

        vm.prank(lender);
        uint256 out = pool.redeem(shares, lender, lender);
        assertApproxEqAbs(out, 5_060e6, 1);
    }

    function test_fork_payGasIsMeasured() public {
        vm.prank(lender);
        pool.deposit(5_000e6, lender);
        LenderPool.Offer memory o = LenderPool.Offer(merchant, 1_000e6, 60e6, 1_000, 0, block.timestamp + 900);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(KEY, pool.hashOffer(o));
        vm.prank(merchant);
        pool.requestAdvance(o, abi.encodePacked(r, s, v));

        vm.prank(customer);
        uint256 g = gasleft();
        router.pay(merchant, 100e6, bytes32("first"));
        uint256 used = g - gasleft();
        emit log_named_uint("gas for split pay() with active advance", used);
        assertLt(used, 200_000);
    }
}
