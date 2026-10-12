import { describe, expect, it } from "vitest";
import { paymentsToRepay, quoteSplit } from "../src/split.js";
import { ONE_USDC } from "../src/constants.js";
import { rng } from "./helpers.js";

const U = ONE_USDC;

describe("quoteSplit grid", () => {
  const amounts = [1n, 9n, 10n, 999n, U, 7n * U + 3n, 100n * U, 12_345_678n];
  const owed = [0n, 1n, 5n * U, 106n * U, 10_000n * U];
  const bps = [0, 1, 100, 1000, 2500, 5000];
  const grid = amounts.flatMap((a) => owed.flatMap((o) => bps.map((b) => [a, o, b] as const)));

  it.each(grid)("amount %s owed %s bps %s", (a, o, b) => {
    const { toPool, toMerchant } = quoteSplit(a, o, b);
    expect(toPool + toMerchant).toBe(a);
    expect(toPool).toBeLessThanOrEqual(o);
    expect(toPool).toBeLessThanOrEqual((a * BigInt(b)) / 10_000n);
    const uncapped = (a * BigInt(b)) / 10_000n;
    expect(toPool).toBe(uncapped < o ? uncapped : o);
  });
});

describe("quoteSplit validation", () => {
  it.each([-1, 10_001, 1.5, Number.NaN])("rejects bps %s", (b) => {
    expect(() => quoteSplit(U, U, b)).toThrow(RangeError);
  });
  it("rejects negative amount", () => expect(() => quoteSplit(-1n, 0n, 100)).toThrow(RangeError));
  it("rejects negative owed", () => expect(() => quoteSplit(1n, -1n, 100)).toThrow(RangeError));
});

describe("paymentsToRepay matches simulation", () => {
  const seeds = Array.from({ length: 150 }, (_, i) => i);
  it.each(seeds)("seed %i", (seed) => {
    const r = rng(seed + 1000);
    const owed = r.big(1n, 10_000n * U);
    const bps = r.int(1, 5000);
    const sale = r.big(1n, 2_000n * U);
    const n = paymentsToRepay(owed, sale, bps);
    if (n === null) {
      expect(quoteSplit(sale, owed, bps).toPool).toBe(0n);
      return;
    }
    if (n > 100_000n) return;
    let left = owed;
    let count = 0n;
    while (left > 0n) {
      left -= quoteSplit(sale, left, bps).toPool;
      count++;
    }
    expect(count).toBe(n);
  });

  it("zero owed needs zero payments", () => expect(paymentsToRepay(0n, U, 1000)).toBe(0n));
  it("zero holdback never repays", () => expect(paymentsToRepay(U, U, 0)).toBeNull());
  it("tiny sale never repays", () => expect(paymentsToRepay(U, 9n, 1000)).toBeNull());
});
