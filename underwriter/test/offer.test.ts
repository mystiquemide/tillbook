import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { buildOffer, hashOffer, recoverOfferSigner, signOffer, validateOffer, type Offer } from "../src/offer.js";
import { ONE_USDC, OFFER_TTL_SECONDS } from "../src/constants.js";
import { addr, NOW, rng } from "./helpers.js";

const KEY = "0x00000000000000000000000000000000000000000000000000000000000a11ce" as const;
const SIGNER = privateKeyToAccount(KEY).address;
const POOL = addr(0x9001);
const CHAIN = 143;
const U = ONE_USDC;

const base = (): Offer => ({
  merchant: addr(0xabc),
  amount: 250n * U,
  fee: 15n * U,
  holdbackBps: 1000,
  nonce: 0n,
  expiry: NOW + 900n,
});

describe("buildOffer", () => {
  it("sets expiry to now + 15 minutes", () => {
    const o = buildOffer({ merchant: addr(1), amount: U, fee: 0n, holdbackBps: 1000, nonce: 3n, now: NOW });
    expect(o.expiry).toBe(NOW + OFFER_TTL_SECONDS);
    expect(o.nonce).toBe(3n);
  });
  it("checksums the merchant", () => {
    const lower = "0x52908400098527886e0f7030069857d2e4169ee7" as const;
    const o = buildOffer({ merchant: lower, amount: U, fee: 0n, holdbackBps: 1000, nonce: 0n, now: NOW });
    expect(o.merchant).toBe("0x52908400098527886E0F7030069857D2E4169EE7");
  });
  it("honours a custom ttl", () => {
    const o = buildOffer({ merchant: addr(1), amount: U, fee: 0n, holdbackBps: 1000, nonce: 0n, now: NOW, ttl: 60n });
    expect(o.expiry).toBe(NOW + 60n);
  });
});

describe("validateOffer rejects what the contract rejects", () => {
  const bad: [string, Partial<Offer>][] = [
    ["zero amount", { amount: 0n }],
    ["negative amount", { amount: -1n }],
    ["fee above amount", { fee: 250n * U + 1n }],
    ["negative fee", { fee: -1n }],
    ["zero holdback", { holdbackBps: 0 }],
    ["holdback above max", { holdbackBps: 5001 }],
    ["fractional holdback", { holdbackBps: 10.5 }],
    ["negative nonce", { nonce: -1n }],
    ["zero expiry", { expiry: 0n }],
    ["bad merchant", { merchant: "0x1234" as `0x${string}` }],
    ["uint128 overflow", { amount: 1n << 128n, fee: 0n }],
  ];
  it.each(bad)("%s", (_name, patch) => {
    expect(() => validateOffer({ ...base(), ...patch })).toThrow();
  });
  it.each([1, 1000, 5000])("accepts holdback %i", (b) => {
    expect(() => validateOffer({ ...base(), holdbackBps: b })).not.toThrow();
  });
  it("accepts fee equal to amount", () => expect(() => validateOffer({ ...base(), fee: 250n * U })).not.toThrow());
  it("refuses to sign an invalid offer", async () => {
    await expect(signOffer({ ...base(), amount: 0n }, KEY, CHAIN, POOL)).rejects.toThrow();
  });
});

describe("sign and recover round trip", () => {
  const seeds = Array.from({ length: 60 }, (_, i) => i);
  it.each(seeds)("seed %i", async (seed) => {
    const r = rng(seed + 42);
    const amount = r.big(1n, 5_000n * U);
    const o: Offer = {
      merchant: addr(r.int(1, 1_000_000)),
      amount,
      fee: (amount * BigInt(r.int(0, 10_000))) / 10_000n,
      holdbackBps: r.int(1, 5000),
      nonce: BigInt(r.int(0, 50)),
      expiry: NOW + BigInt(r.int(1, 10_000)),
    };
    const sig = await signOffer(o, KEY, CHAIN, POOL);
    expect(await recoverOfferSigner(o, sig, CHAIN, POOL)).toBe(SIGNER);
  });
});

describe("tampering changes the recovered signer", () => {
  const fields: [string, (o: Offer) => Offer][] = [
    ["merchant", (o) => ({ ...o, merchant: addr(0xdead) })],
    ["amount", (o) => ({ ...o, amount: o.amount + 1n })],
    ["fee", (o) => ({ ...o, fee: o.fee - 1n })],
    ["holdbackBps", (o) => ({ ...o, holdbackBps: o.holdbackBps + 1 })],
    ["nonce", (o) => ({ ...o, nonce: o.nonce + 1n })],
    ["expiry", (o) => ({ ...o, expiry: o.expiry + 1n })],
  ];
  it.each(fields)("%s", async (_f, mutate) => {
    const o = base();
    const sig = await signOffer(o, KEY, CHAIN, POOL);
    expect(await recoverOfferSigner(mutate(o), sig, CHAIN, POOL)).not.toBe(SIGNER);
  });
  it("other chain", async () => {
    const sig = await signOffer(base(), KEY, CHAIN, POOL);
    expect(await recoverOfferSigner(base(), sig, 10143, POOL)).not.toBe(SIGNER);
  });
  it("other pool", async () => {
    const sig = await signOffer(base(), KEY, CHAIN, POOL);
    expect(await recoverOfferSigner(base(), sig, CHAIN, addr(0x9002))).not.toBe(SIGNER);
  });
  it("hash differs per chain and pool", () => {
    const h = hashOffer(base(), CHAIN, POOL);
    expect(hashOffer(base(), 10143, POOL)).not.toBe(h);
    expect(hashOffer(base(), CHAIN, addr(0x9002))).not.toBe(h);
    expect(hashOffer(base(), CHAIN, POOL)).toBe(h);
  });
});
