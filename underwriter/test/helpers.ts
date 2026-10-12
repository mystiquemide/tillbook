import type { Address, Hex, Payment } from "../src/types.js";

/** Deterministic PRNG so every generated case is reproducible. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    big: (min: bigint, max: bigint) => min + BigInt(Math.floor(next() * Number(max - min + 1n))),
  };
}

export const addr = (n: number): Address => `0x${n.toString(16).padStart(40, "0")}` as Address;
export const MERCHANT = addr(0xabc);
export const NOW = 1_760_000_000n;
export const DAY = 86_400n;

export function pay(payer: Address, amount: bigint, ageSeconds = 0n, merchant: Address = MERCHANT): Payment {
  return {
    merchant,
    payer,
    amount,
    repaid: 0n,
    timestamp: NOW - ageSeconds,
    blockNumber: 1n,
    txHash: ("0x" + "11".repeat(32)) as Hex,
    ref: ("0x" + "00".repeat(32)) as Hex,
  };
}
