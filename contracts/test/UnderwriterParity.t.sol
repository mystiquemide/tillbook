// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {LenderPool} from "../src/LenderPool.sol";
import {SplitRouter} from "../src/SplitRouter.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

/// @notice Offers and split quotes produced by the TypeScript underwriter
/// (`underwriter/scripts/write-fixtures.ts`) must match the contracts exactly.
contract UnderwriterParityTest is Test {
    using stdJson for string;

    uint256 internal constant KEY = 0xA11CE;
    string internal json;
    MockUSDC internal usdc;
    LenderPool internal pool;
    SplitRouter internal router;

    function setUp() public {
        json = vm.readFile(string.concat(vm.projectRoot(), "/test/fixtures/underwriter.json"));
        vm.chainId(json.readUint(".chainId"));
        usdc = new MockUSDC();
        address poolAddr = json.readAddress(".pool");
        deployCodeTo("LenderPool.sol:LenderPool", abi.encode(usdc, vm.addr(KEY), type(uint256).max), poolAddr);
        pool = LenderPool(poolAddr);
        router = new SplitRouter(pool);

        usdc.mint(address(this), 1e15);
        usdc.approve(address(pool), type(uint256).max);
        pool.deposit(1e15, address(this));
    }

    function _offer(uint256 i) internal view returns (LenderPool.Offer memory o, bytes32 digest, bytes memory sig) {
        string memory p = string.concat(".offers[", vm.toString(i), "]");
        o = LenderPool.Offer({
            merchant: json.readAddress(string.concat(p, ".merchant")),
            amount: json.readUint(string.concat(p, ".amount")),
            fee: json.readUint(string.concat(p, ".fee")),
            holdbackBps: uint16(json.readUint(string.concat(p, ".holdbackBps"))),
            nonce: 0,
            expiry: json.readUint(string.concat(p, ".expiry"))
        });
        digest = json.readBytes32(string.concat(p, ".digest"));
        sig = json.readBytes(string.concat(p, ".signature"));
    }

    function test_offerDigestsMatch() public view {
        uint256 n = json.readUint(".offerCount");
        assertEq(n, 64);
        for (uint256 i; i < n; i++) {
            (LenderPool.Offer memory o, bytes32 digest,) = _offer(i);
            assertEq(pool.hashOffer(o), digest, string.concat("digest mismatch at ", vm.toString(i)));
        }
    }

    function test_signedOffersAreAcceptedOnchain() public {
        vm.warp(1);
        uint256 n = json.readUint(".offerCount");
        for (uint256 i; i < n; i++) {
            (LenderPool.Offer memory o,, bytes memory sig) = _offer(i);
            vm.prank(o.merchant);
            pool.requestAdvance(o, sig);
            LenderPool.Advance memory a = pool.advanceOf(o.merchant);
            assertEq(a.owed, o.amount + o.fee);
            assertEq(a.holdbackBps, o.holdbackBps);
        }
    }

    function test_splitQuotesMatch() public {
        vm.warp(1);
        uint256 n = json.readUint(".splitCount");
        assertEq(n, 64);
        for (uint256 i; i < n; i++) {
            string memory p = string.concat(".splits[", vm.toString(i), "]");
            uint256 amount = json.readUint(string.concat(p, ".amount"));
            uint256 owed = json.readUint(string.concat(p, ".owed"));
            uint16 bps = uint16(json.readUint(string.concat(p, ".bps")));
            address m = address(uint160(0x5000 + i));

            LenderPool.Offer memory o = LenderPool.Offer(m, owed, 0, bps, 0, 100);
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(KEY, pool.hashOffer(o));
            vm.prank(m);
            pool.requestAdvance(o, abi.encodePacked(r, s, v));

            (uint256 toPool,) = router.quote(m, amount);
            assertEq(
                toPool, json.readUint(string.concat(p, ".toPool")), string.concat("split mismatch at ", vm.toString(i))
            );
        }
    }
}
