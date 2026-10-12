// Builds real payment history for a merchant and runs one advance through the full loop:
// lender deposit -> customer payments -> signed offer -> draw -> payments repay it.
//
// Env:
//   RPC_URL, POOL_ADDRESS, ROUTER_ADDRESS, POOL_DEPLOY_BLOCK
//   LENDER_KEY, MERCHANT_KEY, PAYER_KEYS (comma separated, at least 3), UNDERWRITER_PRIVATE_KEY
//   DEPOSIT_USDC (default 50), PAYMENT_USDC (default 2), PAYMENTS_PER_PAYER (default 2)
import { createPublicClient, createWalletClient, defineChain, http, parseAbi, parseUnits, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { poolAbi } from "../src/abi.js";
import { quoteMerchant } from "../src/service.js";
import type { Address } from "../src/types.js";

const env = (k: string, d?: string) => {
  const v = process.env[k] ?? d;
  if (v === undefined || v === "") throw new Error(`missing env ${k}`);
  return v;
};

const rpc = env("RPC_URL");
const pool = env("POOL_ADDRESS") as Address;
const router = env("ROUTER_ADDRESS") as Address;
const fromBlock = BigInt(env("POOL_DEPLOY_BLOCK"));
const underwriterKey = env("UNDERWRITER_PRIVATE_KEY") as Hex;
const lender = privateKeyToAccount(env("LENDER_KEY") as Hex);
const merchant = privateKeyToAccount(env("MERCHANT_KEY") as Hex);
const payers = env("PAYER_KEYS").split(",").map((k) => privateKeyToAccount(k.trim() as Hex));
if (payers.length < 3) throw new Error("PAYER_KEYS needs at least 3 keys");

const deposit = parseUnits(env("DEPOSIT_USDC", "50"), 6);
const payment = parseUnits(env("PAYMENT_USDC", "2"), 6);
const perPayer = Number(env("PAYMENTS_PER_PAYER", "2"));

const pub = createPublicClient({ transport: http(rpc), pollingInterval: 250 });
const chainId = await pub.getChainId();
const chain = defineChain({ id: chainId, name: "monad", nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });

const erc20 = parseAbi([
  "function approve(address,uint256) returns (bool)",
  "function allowance(address,address) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
]);
const routerAbi = parseAbi(["function pay(address merchant, uint256 amount, bytes32 ref)"]);
const poolWriteAbi = parseAbi(["function deposit(uint256 assets, address receiver) returns (uint256)", "function asset() view returns (address)"]);

const usdc = (await pub.readContract({ address: pool, abi: poolWriteAbi, functionName: "asset" })) as Address;
const txs: { step: string; hash: Hex }[] = [];

async function send(account: ReturnType<typeof privateKeyToAccount>, step: string, req: Parameters<ReturnType<typeof createWalletClient>["writeContract"]>[0]) {
  const wallet = createWalletClient({ account, chain, transport: http(rpc) });
  const hash = await wallet.writeContract({ ...req, account, chain } as never);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${step} reverted: ${hash}`);
  txs.push({ step, hash });
  console.log(`${step.padEnd(28)} ${hash}  gas ${receipt.gasUsed}`);
  return receipt;
}

async function ensureAllowance(account: ReturnType<typeof privateKeyToAccount>, spender: Address, label: string) {
  const current = (await pub.readContract({ address: usdc, abi: erc20, functionName: "allowance", args: [account.address, spender] })) as bigint;
  if (current < 2n ** 128n) await send(account, `approve ${label}`, { address: usdc, abi: erc20, functionName: "approve", args: [spender, 2n ** 256n - 1n] } as never);
}

let ref = 0;
const nextRef = () => (`0x${(++ref).toString(16).padStart(64, "0")}`) as Hex;

async function payRound(label: string) {
  for (const [i, p] of payers.entries()) {
    for (let k = 0; k < perPayer; k++) {
      await send(p, `${label} payer${i + 1} #${k + 1}`, { address: router, abi: routerAbi, functionName: "pay", args: [merchant.address, payment, nextRef()] } as never);
    }
  }
}

console.log(`chain ${chainId}  pool ${pool}  router ${router}  merchant ${merchant.address}`);

await ensureAllowance(lender, pool, "lender->pool");
await send(lender, "deposit", { address: pool, abi: poolWriteAbi, functionName: "deposit", args: [deposit, lender.address] } as never);
for (const [i, p] of payers.entries()) await ensureAllowance(p, router, `payer${i + 1}->router`);

await payRound("sale");

const block = await pub.getBlock();
const q = await quoteMerchant({ client: pub as never, chainId, pool, router, merchant: merchant.address, underwriterKey, fromBlock, now: block.timestamp });
if (!q.eligible) throw new Error(`no offer: ${q.reason}`);
console.log(`offer: ${q.offer.amount} (fee ${q.offer.fee}, holdback ${q.offer.holdbackBps} bps) from ${q.inputs.distinctPayers} payers`);
await send(merchant, "draw advance", { address: pool, abi: poolAbi, functionName: "requestAdvance", args: [q.offer, q.signature] } as never);

let rounds = 0;
for (;;) {
  const [owed] = (await pub.readContract({ address: pool, abi: poolAbi, functionName: "holdbackOf", args: [merchant.address] })) as [bigint, number];
  if (owed === 0n) break;
  if (++rounds > 50) throw new Error("advance not repaid after 50 rounds");
  await payRound(`repay r${rounds}`);
}

const count = await pub.readContract({ address: pool, abi: poolAbi, functionName: "repaidCount", args: [merchant.address] });
console.log(`done: advance repaid, repaidCount=${count}, ${txs.length} transactions`);
