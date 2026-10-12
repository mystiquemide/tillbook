import { BPS } from "./constants.js";

/** Mirrors SplitRouter.quote: share of a payment that repays the pool. */
export function quoteSplit(amount: bigint, owed: bigint, holdbackBps: number): { toPool: bigint; toMerchant: bigint } {
  if (amount < 0n || owed < 0n) throw new RangeError("amount and owed must be >= 0");
  if (!Number.isInteger(holdbackBps) || holdbackBps < 0 || holdbackBps > 10_000) {
    throw new RangeError("holdbackBps must be an integer in [0, 10000]");
  }
  let toPool = (amount * BigInt(holdbackBps)) / BPS;
  if (toPool > owed) toPool = owed;
  return { toPool, toMerchant: amount - toPool };
}

/** Number of equal payments needed to clear `owed`. Returns null when payments never repay. */
export function paymentsToRepay(owed: bigint, sale: bigint, holdbackBps: number): bigint | null {
  if (owed === 0n) return 0n;
  const { toPool } = quoteSplit(sale, owed, holdbackBps);
  if (toPool === 0n) return null;
  const skim = (sale * BigInt(holdbackBps)) / BPS;
  return (owed + skim - 1n) / skim;
}
