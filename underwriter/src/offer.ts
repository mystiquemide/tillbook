import { hashTypedData, recoverTypedDataAddress, getAddress, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { MAX_HOLDBACK_BPS, OFFER_TTL_SECONDS } from "./constants.js";
import type { Address, Hex } from "./types.js";

export type Offer = {
  merchant: Address;
  amount: bigint;
  fee: bigint;
  holdbackBps: number;
  nonce: bigint;
  expiry: bigint;
};

export const OFFER_TYPES = {
  Offer: [
    { name: "merchant", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "fee", type: "uint256" },
    { name: "holdbackBps", type: "uint16" },
    { name: "nonce", type: "uint256" },
    { name: "expiry", type: "uint256" },
  ],
} as const;

export function offerDomain(chainId: number, pool: Address) {
  return { name: "Tillbook", version: "1", chainId, verifyingContract: getAddress(pool) } as const;
}

const UINT128_MAX = (1n << 128n) - 1n;

/** Same checks the contract makes, so a bad offer never gets signed. */
export function validateOffer(o: Offer): void {
  if (!isAddress(o.merchant)) throw new TypeError("merchant is not an address");
  if (o.amount <= 0n) throw new RangeError("amount must be > 0");
  if (o.fee < 0n || o.fee > o.amount) throw new RangeError("fee must be in [0, amount]");
  if (o.amount + o.fee > UINT128_MAX) throw new RangeError("amount + fee exceeds uint128");
  if (!Number.isInteger(o.holdbackBps) || o.holdbackBps < 1 || o.holdbackBps > MAX_HOLDBACK_BPS) {
    throw new RangeError(`holdbackBps must be in [1, ${MAX_HOLDBACK_BPS}]`);
  }
  if (o.nonce < 0n) throw new RangeError("nonce must be >= 0");
  if (o.expiry <= 0n) throw new RangeError("expiry must be > 0");
}

export function buildOffer(args: {
  merchant: Address;
  amount: bigint;
  fee: bigint;
  holdbackBps: number;
  nonce: bigint;
  now: bigint;
  ttl?: bigint;
}): Offer {
  const offer: Offer = {
    merchant: getAddress(args.merchant),
    amount: args.amount,
    fee: args.fee,
    holdbackBps: args.holdbackBps,
    nonce: args.nonce,
    expiry: args.now + (args.ttl ?? OFFER_TTL_SECONDS),
  };
  validateOffer(offer);
  return offer;
}

export function hashOffer(offer: Offer, chainId: number, pool: Address): Hex {
  return hashTypedData({ domain: offerDomain(chainId, pool), types: OFFER_TYPES, primaryType: "Offer", message: offer });
}

export async function signOffer(offer: Offer, privateKey: Hex, chainId: number, pool: Address): Promise<Hex> {
  validateOffer(offer);
  const account = privateKeyToAccount(privateKey);
  return account.signTypedData({ domain: offerDomain(chainId, pool), types: OFFER_TYPES, primaryType: "Offer", message: offer });
}

export async function recoverOfferSigner(offer: Offer, signature: Hex, chainId: number, pool: Address): Promise<Address> {
  return recoverTypedDataAddress({
    domain: offerDomain(chainId, pool),
    types: OFFER_TYPES,
    primaryType: "Offer",
    message: offer,
    signature,
  });
}
