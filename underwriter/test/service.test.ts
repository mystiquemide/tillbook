import { describe, expect, it } from "vitest";
import { getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { quoteMerchant, toJson, type ReadClient } from "../src/service.js";
import { recoverOfferSigner } from "../src/offer.js";
import { ONE_USDC } from "../src/constants.js";
import { addr } from "./helpers.js";

const KEY = "0x00000000000000000000000000000000000000000000000000000000000a11ce" as const;
const POOL = addr(0x9001);
const ROUTER = addr(0x7777);
const MERCHANT = "0x0000000000000000000000000000000000000abc";
const U = ONE_USDC;
const NOW = 2_000_000n;
const TX = ("0x" + "ab".repeat(32)) as `0x${string}`;
const REF = ("0x" + "00".repeat(32)) as `0x${string}`;

type State = { nonce: bigint; repaid: bigint; idle: bigint; owed: bigint; payers: number; each: bigint };

function client(s: State): ReadClient {
  return {
    getBlockNumber: async () => 10n,
    getBlock: async () => ({ timestamp: NOW - 60n }),
    getLogs: async ({ fromBlock }: { fromBlock: bigint }) =>
      fromBlock === 0n
        ? Array.from({ length: s.payers }, (_, i) => ({
            args: { merchant: MERCHANT, payer: addr(i + 1), amount: s.each, repaid: 0n, ref: REF },
            blockNumber: 1n,
            transactionHash: TX,
          }))
        : [],
    readContract: async ({ functionName }: { functionName: string }) => {
      switch (functionName) {
        case "nonces": return s.nonce;
        case "repaidCount": return s.repaid;
        case "idle": return s.idle;
        case "holdbackOf": return [s.owed, s.owed > 0n ? 1000 : 0];
        default: throw new Error(functionName);
      }
    },
  } as unknown as ReadClient;
}

const run = (s: Partial<State>, merchant = MERCHANT) =>
  quoteMerchant({
    client: client({ nonce: 0n, repaid: 0n, idle: 10_000n * U, owed: 0n, payers: 5, each: 100n * U, ...s }),
    chainId: 143,
    pool: POOL,
    router: ROUTER,
    merchant,
    underwriterKey: KEY,
    fromBlock: 0n,
    now: NOW,
    chunkSize: 1000n,
  });

describe("quoteMerchant", () => {
  it("signs a valid offer with the current nonce", async () => {
    const r = await run({ nonce: 4n });
    expect(r.eligible).toBe(true);
    if (!r.eligible) return;
    expect(r.offer.amount).toBe(250n * U);
    expect(r.offer.nonce).toBe(4n);
    expect(r.offer.expiry).toBe(NOW + 900n);
    expect(await recoverOfferSigner(r.offer, r.signature, 143, POOL)).toBe(privateKeyToAccount(KEY).address);
    expect(r.payments).toHaveLength(5);
  });

  it("refuses while an advance is active", async () => {
    expect(await run({ owed: 1n })).toMatchObject({ eligible: false, reason: "advance_active" });
  });

  it("explains too few payers", async () => {
    expect(await run({ payers: 2 })).toMatchObject({ eligible: false, reason: "too_few_payers" });
  });

  it("explains an empty pool", async () => {
    expect(await run({ idle: 0n })).toMatchObject({ eligible: false, reason: "pool_empty" });
  });

  it("applies the repayment boost", async () => {
    const r = await run({ repaid: 4n });
    expect(r.eligible && r.offer.amount).toBe(500n * U);
  });

  it("rejects a bad merchant address", async () => {
    await expect(run({}, "not-an-address")).rejects.toThrow(TypeError);
  });

  it("accepts a lowercase merchant and checksums it", async () => {
    const r = await run({}, MERCHANT.toLowerCase());
    expect(r.eligible && r.offer.merchant).toBe(getAddress(MERCHANT));
  });

  it.each([1n, 2n, 3n, 5n, 8n, 13n])("idle %s USDC caps the offer", async (idle) => {
    const r = await run({ idle: idle * U });
    expect(r.eligible && r.offer.amount).toBe(idle * U);
  });
});

describe("toJson", () => {
  it("turns bigints into strings and keeps structure", () => {
    expect(toJson({ a: 1n, b: [2n, { c: 3n }], d: "x" })).toEqual({ a: "1", b: ["2", { c: "3" }], d: "x" });
  });
});
