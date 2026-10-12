import {
  ADVANCE_RATIO_BPS,
  BOOST_STEP_BPS,
  BPS,
  FEE_BPS,
  HOLDBACK_BPS,
  MAX_ADVANCE,
  MAX_BOOST_BPS,
  MIN_DISTINCT_PAYERS,
  PAYER_CAP_BPS,
  WINDOW_SECONDS,
} from "./constants.js";
import type { Address, Payment } from "./types.js";

export type OfferInputs = {
  /** Sum of in-window payments from customers other than the merchant. */
  volume: bigint;
  /** Volume after capping each customer at PAYER_CAP_BPS of `volume`. */
  cappedVolume: bigint;
  distinctPayers: number;
  repaidCount: bigint;
  /** Multiplier in basis points (10_000 = 1x). */
  boostBps: bigint;
  poolIdle: bigint;
  windowStart: bigint;
};

export type OfferTerms =
  | { eligible: true; amount: bigint; fee: bigint; holdbackBps: number; inputs: OfferInputs }
  | { eligible: false; reason: IneligibleReason; inputs: OfferInputs };

export type IneligibleReason = "too_few_payers" | "no_volume" | "pool_empty";

export type FormulaInput = {
  merchant: Address;
  payments: readonly Payment[];
  repaidCount: bigint;
  poolIdle: bigint;
  now: bigint;
};

const lower = (a: string) => a.toLowerCase();

export function boostFor(repaidCount: bigint): bigint {
  const boost = BPS + BOOST_STEP_BPS * repaidCount;
  return boost > MAX_BOOST_BPS ? MAX_BOOST_BPS : boost;
}

/** Sum each payer's volume, then cap every payer at `capBps` of the total. */
export function cappedVolume(perPayer: ReadonlyMap<string, bigint>, capBps: bigint = PAYER_CAP_BPS): {
  volume: bigint;
  capped: bigint;
} {
  let volume = 0n;
  for (const v of perPayer.values()) volume += v;
  const cap = (volume * capBps) / BPS;
  let capped = 0n;
  for (const v of perPayer.values()) capped += v > cap ? cap : v;
  return { volume, capped };
}

export function computeOffer(input: FormulaInput): OfferTerms {
  if (input.repaidCount < 0n) throw new RangeError("repaidCount must be >= 0");
  if (input.poolIdle < 0n) throw new RangeError("poolIdle must be >= 0");

  const merchant = lower(input.merchant);
  const windowStart = input.now > WINDOW_SECONDS ? input.now - WINDOW_SECONDS : 0n;

  const perPayer = new Map<string, bigint>();
  for (const p of input.payments) {
    if (lower(p.merchant) !== merchant) continue;
    if (lower(p.payer) === merchant) continue;
    if (p.timestamp < windowStart || p.timestamp > input.now) continue;
    if (p.amount <= 0n) continue;
    const key = lower(p.payer);
    perPayer.set(key, (perPayer.get(key) ?? 0n) + p.amount);
  }

  const { volume, capped } = cappedVolume(perPayer);
  const boostBps = boostFor(input.repaidCount);
  const inputs: OfferInputs = {
    volume,
    cappedVolume: capped,
    distinctPayers: perPayer.size,
    repaidCount: input.repaidCount,
    boostBps,
    poolIdle: input.poolIdle,
    windowStart,
  };

  if (perPayer.size < MIN_DISTINCT_PAYERS) return { eligible: false, reason: "too_few_payers", inputs };
  if (input.poolIdle === 0n) return { eligible: false, reason: "pool_empty", inputs };

  let amount = (((capped * ADVANCE_RATIO_BPS) / BPS) * boostBps) / BPS;
  if (amount > MAX_ADVANCE) amount = MAX_ADVANCE;
  if (amount > input.poolIdle) amount = input.poolIdle;
  if (amount === 0n) return { eligible: false, reason: "no_volume", inputs };

  const fee = (amount * FEE_BPS) / BPS;
  return { eligible: true, amount, fee, holdbackBps: HOLDBACK_BPS, inputs };
}
