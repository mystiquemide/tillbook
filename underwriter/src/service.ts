import { getAddress, isAddress } from "viem";
import { poolAbi } from "./abi.js";
import { computeOffer, type OfferInputs, type IneligibleReason } from "./formula.js";
import { fetchPayments, type LogClient } from "./history.js";
import { buildOffer, signOffer, type Offer } from "./offer.js";
import type { Address, Hex, Payment } from "./types.js";

export type ReadClient = LogClient & {
  readContract(args: { address: Address; abi: typeof poolAbi; functionName: string; args?: readonly unknown[] }): Promise<unknown>;
};

export type OfferResponse =
  | {
      eligible: true;
      offer: Offer;
      signature: Hex;
      inputs: OfferInputs;
      payments: Payment[];
    }
  | {
      eligible: false;
      reason: IneligibleReason | "advance_active";
      inputs: OfferInputs | null;
      payments: Payment[];
    };

export async function quoteMerchant(args: {
  client: ReadClient;
  chainId: number;
  pool: Address;
  router: Address;
  merchant: string;
  underwriterKey: Hex;
  fromBlock: bigint;
  now: bigint;
  chunkSize?: bigint;
}): Promise<OfferResponse> {
  if (!isAddress(args.merchant)) throw new TypeError("merchant is not an address");
  const merchant = getAddress(args.merchant);
  const read = <T>(functionName: string, a: readonly unknown[] = []) =>
    args.client.readContract({ address: args.pool, abi: poolAbi, functionName, args: a }) as Promise<T>;

  const [nonce, repaidCount, idle, holdback] = await Promise.all([
    read<bigint>("nonces", [merchant]),
    read<bigint>("repaidCount", [merchant]),
    read<bigint>("idle"),
    read<readonly [bigint, number]>("holdbackOf", [merchant]),
  ]);

  const payments = await fetchPayments({
    client: args.client,
    router: args.router,
    merchant,
    fromBlock: args.fromBlock,
    chunkSize: args.chunkSize,
  });

  if (holdback[0] > 0n) return { eligible: false, reason: "advance_active", inputs: null, payments };

  const terms = computeOffer({ merchant, payments, repaidCount, poolIdle: idle, now: args.now });
  if (!terms.eligible) return { eligible: false, reason: terms.reason, inputs: terms.inputs, payments };

  const offer = buildOffer({
    merchant,
    amount: terms.amount,
    fee: terms.fee,
    holdbackBps: terms.holdbackBps,
    nonce,
    now: args.now,
  });
  const signature = await signOffer(offer, args.underwriterKey, args.chainId, args.pool);
  return { eligible: true, offer, signature, inputs: terms.inputs, payments };
}

/** JSON-safe copy: bigints become decimal strings. */
export function toJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
}
