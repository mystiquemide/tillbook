import "server-only";
import { blockRanges } from "@tillbook/underwriter";
import { createPublicClient, http, parseEventLogs, type AbiEvent, type Address, type Log } from "viem";
import { addresses, deployBlock, monad } from "./chain";

// Public Monad RPCs cap eth_getLogs at 100 blocks; this endpoint allows 1,000.
const logsClient = createPublicClient({
  chain: monad,
  transport: http(process.env.RPC_LOGS_URL || "https://rpc3.monad.xyz"),
  cacheTime: 0,
});
const CHUNK = BigInt(process.env.LOG_CHUNK_SIZE || "1000");
const PARALLEL = 8;

// Every pool and router log since deploy, kept in memory and extended on each read.
const logs: Log[] = [];
let scanned = deployBlock - 1n;
let pending: Promise<void> | null = null;

async function scanTo(head: bigint) {
  while (scanned < head) {
    const ranges = blockRanges(scanned + 1n, head, CHUNK).slice(0, PARALLEL);
    const batches = await Promise.all(
      ranges.map(([fromBlock, toBlock]) =>
        logsClient.getLogs({ address: [addresses.pool!, addresses.router!], fromBlock, toBlock }),
      ),
    );
    for (const b of batches) logs.push(...b);
    scanned = ranges[ranges.length - 1][1];
  }
}

async function sync(want: bigint) {
  // Never scan past what the logs endpoint itself has seen, or a lagging node would skip events.
  const tip = await logsClient.getBlockNumber();
  const head = want < tip ? want : tip;
  while (scanned < head) {
    if (!pending) pending = scanTo(head).finally(() => (pending = null));
    await pending;
  }
}

/** getLogs over the cached pool and router history, decoded and filtered like viem's getLogs. */
export async function cachedLogs<E extends AbiEvent>(args: {
  address: Address;
  event: E;
  args?: Record<string, unknown>;
  fromBlock: bigint;
  toBlock: bigint;
}) {
  await sync(args.toBlock);
  const addr = args.address.toLowerCase();
  const inRange = logs.filter(
    (l) => l.address.toLowerCase() === addr && l.blockNumber! >= args.fromBlock && l.blockNumber! <= args.toBlock,
  );
  return parseEventLogs({ abi: [args.event] as [E], logs: inRange, args: args.args as never, strict: true });
}
