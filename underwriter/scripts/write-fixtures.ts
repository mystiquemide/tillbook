// Writes offers signed by this package so the Solidity suite can check that the
// contract accepts exactly what the underwriter signs.
import { writeFileSync } from "node:fs";
import { signOffer, hashOffer, type Offer } from "../src/offer.js";
import { quoteSplit } from "../src/split.js";

const KEY = "0x00000000000000000000000000000000000000000000000000000000000a11ce" as const;
const POOL = "0x00000000000000000000000000000000000F0010" as const;
const CHAIN = 143;

let seed = 7;
const rand = (max: number) => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed % max;
};

const offers: unknown[] = [];
for (let i = 0; i < 64; i++) {
  const amount = BigInt(rand(5_000_000_000) + 1);
  const o: Offer = {
    merchant: `0x${(0x1000 + i).toString(16).padStart(40, "0")}`,
    amount,
    fee: (amount * BigInt(rand(1001))) / 10000n,
    holdbackBps: rand(5000) + 1,
    nonce: 0n,
    expiry: 1_000_000n + BigInt(rand(100_000)),
  };
  offers.push({
    merchant: o.merchant,
    amount: o.amount.toString(),
    fee: o.fee.toString(),
    holdbackBps: o.holdbackBps,
    expiry: o.expiry.toString(),
    digest: hashOffer(o, CHAIN, POOL),
    signature: await signOffer(o, KEY, CHAIN, POOL),
  });
}

const splits: unknown[] = [];
for (let i = 0; i < 64; i++) {
  const amount = BigInt(rand(1_000_000_000) + 1);
  const owed = BigInt(rand(2_000_000_000) + 1);
  const bps = rand(5000) + 1;
  const q = quoteSplit(amount, owed, bps);
  splits.push({ amount: amount.toString(), owed: owed.toString(), bps, toPool: q.toPool.toString() });
}

writeFileSync(
  new URL("../../contracts/test/fixtures/underwriter.json", import.meta.url),
  JSON.stringify({ chainId: CHAIN, pool: POOL, offerCount: offers.length, splitCount: splits.length, offers, splits }, null, 2) + "\n",
);
console.log(`wrote ${offers.length} offers, ${splits.length} splits`);
