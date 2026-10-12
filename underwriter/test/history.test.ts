import { describe, expect, it, vi } from "vitest";
import { blockRanges, fetchPayments, type LogClient } from "../src/history.js";
import { addr } from "./helpers.js";

describe("blockRanges", () => {
  const cases: [bigint, bigint, bigint][] = [];
  for (const from of [0n, 1n, 99n, 100n, 12_345n])
    for (const span of [0n, 1n, 98n, 99n, 100n, 101n, 250n, 1_000n])
      for (const size of [1n, 7n, 100n, 500n]) cases.push([from, from + span, size]);

  it.each(cases)("from %s to %s size %s", (from, to, size) => {
    const r = blockRanges(from, to, size);
    expect(r[0]?.[0]).toBe(from);
    expect(r.at(-1)?.[1]).toBe(to);
    for (let i = 0; i < r.length; i++) {
      const [a, b] = r[i]!;
      expect(b - a + 1n).toBeLessThanOrEqual(size);
      expect(a).toBeLessThanOrEqual(b);
      if (i > 0) expect(a).toBe(r[i - 1]![1] + 1n);
    }
    expect(BigInt(r.length)).toBe((to - from) / size + 1n);
  });
  it("empty when from > to", () => expect(blockRanges(10n, 9n, 5n)).toEqual([]));
  it("rejects zero size", () => expect(() => blockRanges(0n, 1n, 0n)).toThrow(RangeError));
});

const MERCHANT = addr(0xabc);
const ROUTER = addr(0x7777);
const TX = ("0x" + "ab".repeat(32)) as `0x${string}`;
const REF = ("0x" + "00".repeat(32)) as `0x${string}`;

function fakeClient(logsByBlock: Record<number, { payer: `0x${string}`; amount: bigint }[]>, head = 1000n) {
  const getLogs = vi.fn(async ({ fromBlock, toBlock }: { fromBlock: bigint; toBlock: bigint }) => {
    const out = [];
    for (const [b, logs] of Object.entries(logsByBlock)) {
      const bn = BigInt(b);
      if (bn < fromBlock || bn > toBlock) continue;
      for (const l of logs)
        out.push({ args: { merchant: MERCHANT, payer: l.payer, amount: l.amount, repaid: 0n, ref: REF }, blockNumber: bn, transactionHash: TX });
    }
    return out;
  });
  const getBlock = vi.fn(async ({ blockNumber }: { blockNumber: bigint }) => ({ timestamp: 1_000_000n + blockNumber }));
  const client = { getBlockNumber: async () => head, getBlock, getLogs } as unknown as LogClient;
  return { client, getLogs, getBlock };
}

describe("fetchPayments", () => {
  it("reads every chunk and attaches block timestamps", async () => {
    const { client, getLogs } = fakeClient({ 5: [{ payer: addr(1), amount: 10n }], 250: [{ payer: addr(2), amount: 20n }] });
    const ps = await fetchPayments({ client, router: ROUTER, merchant: MERCHANT, fromBlock: 0n, chunkSize: 100n });
    expect(getLogs).toHaveBeenCalledTimes(11);
    expect(ps.map((p) => p.amount)).toEqual([10n, 20n]);
    expect(ps[0]!.timestamp).toBe(1_000_005n);
    expect(ps[1]!.blockNumber).toBe(250n);
  });

  it("caches timestamps per block", async () => {
    const { client, getBlock } = fakeClient({ 7: [{ payer: addr(1), amount: 1n }, { payer: addr(2), amount: 2n }, { payer: addr(3), amount: 3n }] });
    await fetchPayments({ client, router: ROUTER, merchant: MERCHANT, fromBlock: 0n });
    expect(getBlock).toHaveBeenCalledTimes(1);
  });

  it("respects an explicit toBlock", async () => {
    const { client } = fakeClient({ 5: [{ payer: addr(1), amount: 1n }], 900: [{ payer: addr(2), amount: 2n }] });
    const ps = await fetchPayments({ client, router: ROUTER, merchant: MERCHANT, fromBlock: 0n, toBlock: 100n });
    expect(ps).toHaveLength(1);
  });

  it("skips pending logs", async () => {
    const client = {
      getBlockNumber: async () => 10n,
      getBlock: async () => ({ timestamp: 1n }),
      getLogs: async () => [{ args: { payer: addr(1), amount: 1n, repaid: 0n, ref: REF }, blockNumber: null, transactionHash: null }],
    } as unknown as LogClient;
    expect(await fetchPayments({ client, router: ROUTER, merchant: MERCHANT, fromBlock: 0n })).toEqual([]);
  });

  it("throws on malformed logs", async () => {
    const client = {
      getBlockNumber: async () => 10n,
      getBlock: async () => ({ timestamp: 1n }),
      getLogs: async () => [{ args: { payer: addr(1) }, blockNumber: 1n, transactionHash: TX }],
    } as unknown as LogClient;
    await expect(fetchPayments({ client, router: ROUTER, merchant: MERCHANT, fromBlock: 0n })).rejects.toThrow(/malformed/);
  });

  it("returns nothing when fromBlock is past head", async () => {
    const { client, getLogs } = fakeClient({}, 10n);
    expect(await fetchPayments({ client, router: ROUTER, merchant: MERCHANT, fromBlock: 50n })).toEqual([]);
    expect(getLogs).not.toHaveBeenCalled();
  });
});
