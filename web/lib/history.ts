import "server-only";
import { blockRanges } from "@tillbook/underwriter";
import { createPublicClient, getAbiItem, http, pad, parseEventLogs, type Address, type Hash, type Log } from "viem";
import { erc20Abi, poolAbi, routerAbi } from "./abi";
import { addresses, deployBlock, monad } from "./chain";

// This endpoint accepts 10,000-block getLogs ranges when the query is filtered by topic, and returns block timestamps.
const client = createPublicClient({
  chain: monad,
  transport: http(process.env.RPC_HISTORY_URL || "https://rpc2.monad.xyz", { retryCount: 6, retryDelay: 300 }),
  cacheTime: 0,
});
const CHUNK = 10_000n;
const PARALLEL = 5;
const transfer = getAbiItem({ abi: erc20Abi, name: "Transfer" });

type Entry = { scanned: bigint; logs: (Log & { blockTimestamp?: string })[]; pending: Promise<void> | null };
const wallets = new Map<string, Entry>();

async function scan(entry: Entry, who: Address, head: bigint) {
  const topic = pad(who);
  while (entry.scanned < head) {
    const ranges = blockRanges(entry.scanned + 1n, head, CHUNK).slice(0, PARALLEL);
    const batches = await Promise.all(
      ranges.flatMap(([fromBlock, toBlock]) =>
        // Outgoing, then incoming. Two queries, since getLogs can't OR across topic positions.
        [[topic], [null, topic]].map((rest) =>
          client.request({
            method: "eth_getLogs",
            params: [
              {
                address: addresses.token,
                fromBlock: `0x${fromBlock.toString(16)}`,
                toBlock: `0x${toBlock.toString(16)}`,
                topics: [
                  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
                  ...(rest as (`0x${string}` | null)[]),
                ],
              },
            ],
          }),
        ),
      ),
    );
    // Raw JSON-RPC logs carry hex numbers. Convert the ones used for ordering.
    for (const b of batches)
      for (const l of b as unknown as (Entry["logs"][number] & { blockNumber: string; logIndex: string })[])
        entry.logs.push({ ...l, blockNumber: BigInt(l.blockNumber), logIndex: Number(l.logIndex) } as Entry["logs"][number]);
    entry.scanned = ranges[ranges.length - 1][1];
  }
}

// Receipts never change once mined, so each is decoded once per server process.
const receipts = new Map<Hash, Promise<Log[]>>();
function txLogs(hash: Hash) {
  let r = receipts.get(hash);
  if (!r) {
    r = client.getTransactionReceipt({ hash }).then((x) => x.logs as Log[]);
    r.catch(() => receipts.delete(hash));
    receipts.set(hash, r);
  }
  return r;
}

export type HistoryItem = {
  hash: Hash;
  time: number;
  kind: "paid" | "sale" | "deposit" | "withdraw" | "advance" | "sent" | "received";
  /** Net USDC change for this wallet in the transaction, in 6-decimal units. Negative is money out. */
  delta: string;
  counterparty: string | null;
  /** Sales only: the part of the payment that went to repay an advance. */
  repaid?: string;
};

/** Every USDC movement in or out of a wallet since Tillbook launched, newest first, labelled from Tillbook events. */
export async function walletHistory(who: Address, limit = 40): Promise<HistoryItem[]> {
  const key = who.toLowerCase();
  let entry = wallets.get(key);
  if (!entry) {
    if (wallets.size > 500) wallets.delete(wallets.keys().next().value!);
    entry = { scanned: deployBlock - 1n, logs: [], pending: null };
    wallets.set(key, entry);
  }
  const head = await client.getBlockNumber();
  while (entry.scanned < head) {
    if (!entry.pending) entry.pending = scan(entry, who, head).finally(() => (entry!.pending = null));
    await entry.pending;
  }

  const byTx = new Map<Hash, { delta: bigint; time: number; block: bigint; other: string | null }>();
  for (const l of parseEventLogs({ abi: [transfer], logs: entry.logs, strict: true })) {
    const raw = l as unknown as { blockTimestamp?: string };
    const t = byTx.get(l.transactionHash) ?? { delta: 0n, time: Number(raw.blockTimestamp ?? 0), block: l.blockNumber, other: null };
    const out = l.args.from.toLowerCase() === key;
    const inn = l.args.to.toLowerCase() === key;
    if (out) t.delta -= l.args.value;
    if (inn) t.delta += l.args.value;
    t.other ??= out ? l.args.to : l.args.from;
    byTx.set(l.transactionHash, t);
  }

  const recent = [...byTx.entries()].sort((a, b) => (b[1].block > a[1].block ? 1 : b[1].block < a[1].block ? -1 : 0)).slice(0, limit);
  return Promise.all(
    recent.map(async ([hash, t]): Promise<HistoryItem> => {
      // Most RPCs include blockTimestamp in logs. When one doesn't, read it from the block.
      const time = t.time || Number((await client.getBlock({ blockNumber: t.block })).timestamp);
      const base = { hash, time, delta: t.delta.toString() };
      // A customer payment moves USDC straight to the merchant, so the receipt is what says it went through Tillbook.
      {
        const events = parseEventLogs({ abi: [...poolAbi, ...routerAbi], logs: await txLogs(hash) }).filter(
          (e) => [addresses.pool, addresses.router].some((a) => a?.toLowerCase() === e.address.toLowerCase()),
        );
        for (const e of events) {
          if (e.eventName === "Payment") {
            if (e.args.merchant.toLowerCase() === key)
              return { ...base, kind: "sale", counterparty: e.args.payer, repaid: e.args.repaid.toString() };
            if (e.args.payer.toLowerCase() === key) return { ...base, kind: "paid", counterparty: e.args.merchant };
          }
          if (e.eventName === "AdvanceDrawn" && e.args.merchant.toLowerCase() === key)
            return { ...base, kind: "advance", counterparty: null };
          if (e.eventName === "Deposit" && e.args.owner.toLowerCase() === key) return { ...base, kind: "deposit", counterparty: null };
          if (e.eventName === "Withdraw" && e.args.owner.toLowerCase() === key) return { ...base, kind: "withdraw", counterparty: null };
        }
      }
      return { ...base, kind: t.delta < 0n ? "sent" : "received", counterparty: t.other };
    }),
  );
}
