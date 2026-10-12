import { describe, expect, it } from "vitest";
import { boostFor, cappedVolume, computeOffer } from "../src/formula.js";
import { MAX_ADVANCE, ONE_USDC, WINDOW_SECONDS } from "../src/constants.js";
import { addr, DAY, MERCHANT, NOW, pay, rng } from "./helpers.js";

const U = ONE_USDC;
const IDLE = 1_000_000n * U;
const DAY_N = Number(DAY);

const offer = (payments: ReturnType<typeof pay>[], repaidCount = 0n, poolIdle = IDLE) =>
  computeOffer({ merchant: MERCHANT, payments, repaidCount, poolIdle, now: NOW });

describe("hand-checked examples", () => {
  it("five equal payers: 500 volume -> 250 advance, 15 fee", () => {
    const r = offer([1, 2, 3, 4, 5].map((i) => pay(addr(i), 100n * U)));
    expect(r.eligible).toBe(true);
    if (!r.eligible) return;
    expect(r.amount).toBe(250n * U);
    expect(r.fee).toBe(15n * U);
    expect(r.holdbackBps).toBe(1000);
    expect(r.inputs.volume).toBe(500n * U);
    expect(r.inputs.cappedVolume).toBe(500n * U);
  });

  it("three equal payers are each capped at 20%", () => {
    const r = offer([1, 2, 3].map((i) => pay(addr(i), 100n * U)));
    expect(r.eligible && r.inputs.cappedVolume).toBe(180n * U);
    expect(r.eligible && r.amount).toBe(90n * U);
  });

  it("one whale cannot carry the offer", () => {
    const r = offer([pay(addr(1), 10_000n * U), pay(addr(2), 10n * U), pay(addr(3), 10n * U)]);
    expect(r.eligible).toBe(true);
    if (!r.eligible) return;
    expect(r.inputs.volume).toBe(10_020n * U);
    expect(r.inputs.cappedVolume).toBe(2_004n * U + 20n * U);
  });

  it("two payers are not enough", () => {
    const r = offer([pay(addr(1), 1_000n * U), pay(addr(2), 1_000n * U)]);
    expect(r).toMatchObject({ eligible: false, reason: "too_few_payers" });
  });

  it("no payments at all", () => {
    expect(offer([])).toMatchObject({ eligible: false, reason: "too_few_payers" });
  });

  it("empty pool", () => {
    const r = offer([1, 2, 3, 4, 5].map((i) => pay(addr(i), 100n * U)), 0n, 0n);
    expect(r).toMatchObject({ eligible: false, reason: "pool_empty" });
  });

  it("dust volume rounds to no offer", () => {
    const r = offer([1, 2, 3].map((i) => pay(addr(i), 1n)));
    expect(r).toMatchObject({ eligible: false, reason: "no_volume" });
  });

  it("capped at 5,000 USDC", () => {
    const r = offer([1, 2, 3, 4, 5].map((i) => pay(addr(i), 100_000n * U)));
    expect(r.eligible && r.amount).toBe(MAX_ADVANCE);
  });

  it("capped at pool idle", () => {
    const r = offer([1, 2, 3, 4, 5].map((i) => pay(addr(i), 1_000n * U)), 0n, 123n * U);
    expect(r.eligible && r.amount).toBe(123n * U);
  });

  it("merchant paying themselves is ignored", () => {
    const r = offer([pay(MERCHANT, 1_000_000n * U), pay(addr(1), 1n * U), pay(addr(2), 1n * U)]);
    expect(r).toMatchObject({ eligible: false, reason: "too_few_payers" });
    expect(r.inputs.volume).toBe(2n * U);
  });

  it("self-payment check is case-insensitive", () => {
    const upper = MERCHANT.toUpperCase().replace("0X", "0x") as `0x${string}`;
    const r = offer([pay(upper, 999n * U), pay(addr(1), U), pay(addr(2), U), pay(addr(3), U)]);
    expect(r.inputs.volume).toBe(3n * U);
  });

  it("payer identity is case-insensitive", () => {
    const p = addr(0xdef);
    const r = offer([pay(p, U), pay(p.toUpperCase().replace("0X", "0x") as `0x${string}`, U), pay(addr(1), U)]);
    expect(r.inputs.distinctPayers).toBe(2);
  });

  it("payments to other merchants are ignored", () => {
    const r = offer([1, 2, 3].map((i) => pay(addr(i), 100n * U, 0n, addr(0x999))));
    expect(r.inputs.volume).toBe(0n);
  });

  it("payments older than 30 days are ignored", () => {
    const r = offer([1, 2, 3].map((i) => pay(addr(i), 100n * U, WINDOW_SECONDS + 1n)));
    expect(r.inputs.volume).toBe(0n);
  });

  it("payment exactly at window start counts", () => {
    const r = offer([1, 2, 3].map((i) => pay(addr(i), 100n * U, WINDOW_SECONDS)));
    expect(r.inputs.distinctPayers).toBe(3);
  });

  it("future-dated payments are ignored", () => {
    const r = offer([1, 2, 3].map((i) => pay(addr(i), 100n * U, -1n)));
    expect(r.inputs.volume).toBe(0n);
  });

  it("zero-amount payments are ignored", () => {
    const r = offer([1, 2, 3].map((i) => pay(addr(i), 0n)));
    expect(r.inputs.distinctPayers).toBe(0);
  });

  it("repaid advances boost the offer", () => {
    const ps = [1, 2, 3, 4, 5].map((i) => pay(addr(i), 100n * U));
    const r0 = offer(ps, 0n);
    const r2 = offer(ps, 2n);
    expect(r0.eligible && r2.eligible).toBe(true);
    if (!r0.eligible || !r2.eligible) return;
    expect(r2.amount).toBe((r0.amount * 15n) / 10n);
  });

  it("rejects negative repaidCount", () => {
    expect(() => offer([], -1n)).toThrow(RangeError);
  });

  it("rejects negative poolIdle", () => {
    expect(() => offer([], 0n, -1n)).toThrow(RangeError);
  });

  it("window start clamps at zero for early timestamps", () => {
    const r = computeOffer({ merchant: MERCHANT, payments: [], repaidCount: 0n, poolIdle: IDLE, now: 5n });
    expect(r.inputs.windowStart).toBe(0n);
  });
});

describe("boostFor", () => {
  const expected = [10_000n, 12_500n, 15_000n, 17_500n, 20_000n];
  it.each(Array.from({ length: 51 }, (_, i) => i))("repaidCount %i", (n) => {
    const b = boostFor(BigInt(n));
    expect(b).toBe(n < expected.length ? expected[n] : 20_000n);
    if (n > 0) expect(b).toBeGreaterThanOrEqual(boostFor(BigInt(n - 1)));
  });
});

describe("eligibility by distinct payers", () => {
  it.each(Array.from({ length: 41 }, (_, i) => i))("%i payers", (n) => {
    const r = offer(Array.from({ length: n }, (_, i) => pay(addr(i + 1), 50n * U)));
    expect(r.inputs.distinctPayers).toBe(n);
    expect(r.eligible).toBe(n >= 3);
  });
});

describe("cappedVolume", () => {
  const cases = Array.from({ length: 120 }, (_, seed) => seed);
  it.each(cases)("seed %i: capped <= volume, each payer <= 20%%", (seed) => {
    const r = rng(seed + 1);
    const m = new Map<string, bigint>();
    const n = r.int(1, 12);
    for (let i = 0; i < n; i++) m.set(String(i), r.big(1n, 1_000_000n * U));
    const { volume, capped } = cappedVolume(m);
    expect(capped).toBeLessThanOrEqual(volume);
    const cap = (volume * 2_000n) / 10_000n;
    let manual = 0n;
    for (const v of m.values()) manual += v < cap ? v : cap;
    expect(capped).toBe(manual);
    if (n >= 5 && [...m.values()].every((v) => v <= cap)) expect(capped).toBe(volume);
  });
});

describe("generated scenarios: offer invariants", () => {
  const seeds = Array.from({ length: 300 }, (_, i) => i);
  it.each(seeds)("seed %i", (seed) => {
    const r = rng(seed * 7919 + 17);
    const n = r.int(0, 25);
    const payments = [];
    for (let i = 0; i < n; i++) {
      const payer = r.next() < 0.1 ? MERCHANT : addr(r.int(1, 15));
      payments.push(pay(payer, r.big(0n, 5_000n * U), BigInt(r.int(-DAY_N, 40 * DAY_N))));
    }
    const repaid = BigInt(r.int(0, 8));
    const idle = r.next() < 0.1 ? 0n : r.big(1n, 20_000n * U);
    const res = offer(payments, repaid, idle);

    expect(res.inputs.cappedVolume).toBeLessThanOrEqual(res.inputs.volume);
    expect(res.inputs.boostBps).toBe(boostFor(repaid));
    if (res.eligible) {
      expect(res.inputs.distinctPayers).toBeGreaterThanOrEqual(3);
      expect(res.amount).toBeGreaterThan(0n);
      expect(res.amount).toBeLessThanOrEqual(MAX_ADVANCE);
      expect(res.amount).toBeLessThanOrEqual(idle);
      expect(res.amount).toBeLessThanOrEqual(res.inputs.cappedVolume);
      expect(res.fee).toBe((res.amount * 600n) / 10_000n);
      expect(res.fee).toBeLessThanOrEqual(res.amount);
      const more = offer(payments, repaid + 1n, idle);
      expect(more.eligible && more.amount >= res.amount).toBe(true);
    } else {
      expect(["too_few_payers", "no_volume", "pool_empty"]).toContain(res.reason);
    }
  });
});

