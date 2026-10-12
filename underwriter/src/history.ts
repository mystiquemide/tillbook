import { getAddress } from "viem";
import { paymentEvent } from "./abi.js";
import type { Address, Hex, Payment } from "./types.js";

/** The subset of a viem PublicClient this module needs. Kept small so it can be faked in tests. */
export type LogClient = {
  getBlockNumber(): Promise<bigint>;
  getBlock(args: { blockNumber: bigint }): Promise<{ timestamp: bigint }>;
  getLogs(args: {
    address: Address;
    event: typeof paymentEvent;
    args: { merchant: Address };
    fromBlock: bigint;
    toBlock: bigint;
  }): Promise<
    readonly {
      args: { merchant?: Address; payer?: Address; amount?: bigint; repaid?: bigint; ref?: Hex };
      blockNumber: bigint | null;
      transactionHash: Hex | null;
    }[]
  >;
};

/** Split [from, to] into inclusive ranges of at most `size` blocks. */
export function blockRanges(from: bigint, to: bigint, size: bigint): [bigint, bigint][] {
  if (size <= 0n) throw new RangeError("size must be > 0");
  if (from > to) return [];
  const out: [bigint, bigint][] = [];
  for (let start = from; start <= to; start += size) {
    const end = start + size - 1n;
    out.push([start, end > to ? to : end]);
  }
  return out;
}

export async function fetchPayments(args: {
  client: LogClient;
  router: Address;
  merchant: Address;
  fromBlock: bigint;
  toBlock?: bigint;
  chunkSize?: bigint;
}): Promise<Payment[]> {
  const merchant = getAddress(args.merchant);
  const toBlock = args.toBlock ?? (await args.client.getBlockNumber());
  const ranges = blockRanges(args.fromBlock, toBlock, args.chunkSize ?? 100n);

  const timestamps = new Map<bigint, bigint>();
  const payments: Payment[] = [];

  for (const [from, to] of ranges) {
    const logs = await args.client.getLogs({
      address: args.router,
      event: paymentEvent,
      args: { merchant },
      fromBlock: from,
      toBlock: to,
    });
    for (const log of logs) {
      const { payer, amount, repaid, ref } = log.args;
      if (log.blockNumber === null || log.transactionHash === null) continue; // pending
      if (payer === undefined || amount === undefined || repaid === undefined || ref === undefined) {
        throw new Error(`malformed Payment log in tx ${log.transactionHash}`);
      }
      let ts = timestamps.get(log.blockNumber);
      if (ts === undefined) {
        ts = (await args.client.getBlock({ blockNumber: log.blockNumber })).timestamp;
        timestamps.set(log.blockNumber, ts);
      }
      payments.push({
        merchant,
        payer: getAddress(payer),
        amount,
        repaid,
        ref,
        timestamp: ts,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
      });
    }
  }
  return payments;
}
