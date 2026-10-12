// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {LenderPool} from "../src/LenderPool.sol";
import {SplitRouter} from "../src/SplitRouter.sol";

/// @notice Deploys LenderPool and SplitRouter against native USDC on Monad mainnet.
/// Env: UNDERWRITER_ADDRESS (public address of the offer-signing key).
contract Deploy is Script {
    uint256 public constant MONAD_MAINNET = 143;
    address public constant MONAD_USDC = 0x754704Bc059F8C67012fEd69BC8A327a5aafb603;
    /// @dev Matches MAX_ADVANCE in the underwriter formula.
    uint256 public constant MAX_ADVANCE = 5_000e6;

    function run() external returns (LenderPool pool, SplitRouter router) {
        require(block.chainid == MONAD_MAINNET, "Deploy: not Monad mainnet");
        address underwriter = vm.envAddress("UNDERWRITER_ADDRESS");
        return deploy(MONAD_USDC, underwriter);
    }

    function deploy(address usdc, address underwriter) public returns (LenderPool pool, SplitRouter router) {
        require(underwriter != address(0), "Deploy: underwriter not set");
        require(IERC20Metadata(usdc).decimals() == 6, "Deploy: token is not 6 decimals");
        require(keccak256(bytes(IERC20Metadata(usdc).symbol())) == keccak256("USDC"), "Deploy: token is not USDC");

        vm.startBroadcast();
        pool = new LenderPool(IERC20Metadata(usdc), underwriter, MAX_ADVANCE);
        router = new SplitRouter(pool);
        vm.stopBroadcast();

        require(pool.underwriter() == underwriter, "Deploy: underwriter mismatch");
        require(pool.maxAdvance() == MAX_ADVANCE, "Deploy: max advance mismatch");
        require(address(router.pool()) == address(pool), "Deploy: router not wired");
        require(address(router.token()) == usdc, "Deploy: token mismatch");

        console2.log("LenderPool ", address(pool));
        console2.log("SplitRouter", address(router));
        console2.log("Underwriter", underwriter);
        console2.log("MaxAdvance ", MAX_ADVANCE);
    }
}
