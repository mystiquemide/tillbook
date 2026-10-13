import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { quoteMerchant, toJson, type ReadClient } from "@tillbook/underwriter";
import { addresses, deployBlock, isLive, monad } from "@/lib/chain";
import { publicClient, underwriterKey } from "@/lib/server";
import { cachedBlock, cachedLogs } from "@/lib/logs";
import { fromIndexer, indexer, type IndexedPayment } from "@/lib/indexer";

export const dynamic = "force-dynamic";

/** Payment history, offer inputs and, when eligible, a signed offer for one merchant. */
export async function GET(_req: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!isAddress(address)) return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  if (!isLive) return NextResponse.json({ error: "not_live" }, { status: 503 });
  const key = underwriterKey();
  if (!key) return NextResponse.json({ error: "underwriter_not_configured" }, { status: 503 });

  try {
    const block = await publicClient.getBlock();
    // Prefer the Envio index for sales history; fall back to scanning chain logs when it's missing or behind.
    const indexed = await fromIndexer(block.number, () => indexer.payments(address));
    const history = indexed ? indexedHistory(indexed, block.number) : { getLogs: cachedLogs, getBlock: cachedBlock };
    const result = await quoteMerchant({
      client: { ...publicClient, ...history } as unknown as ReadClient,
      chainId: monad.id,
      pool: addresses.pool!,
      router: addresses.router!,
      merchant: address,
      underwriterKey: key,
      fromBlock: deployBlock,
      now: block.timestamp,
      chunkSize: block.number - deployBlock + 1n,
    });
    return NextResponse.json(toJson(result), {
      headers: { "cache-control": "no-store", "x-data-source": indexed ? "envio" : "rpc" },
    });
  } catch (err) {
    console.error("merchant quote failed", err);
    return NextResponse.json({ error: "rpc_unavailable" }, { status: 502 });
  }
}

/** Serves indexed payments in the shape the underwriter's log reader expects, so the offer math is identical either way. */
function indexedHistory(payments: IndexedPayment[], head: bigint) {
  const rows = payments.filter((p) => BigInt(p.blockNumber) <= head);
  const times = new Map(rows.map((p) => [BigInt(p.blockNumber), BigInt(p.timestamp)]));
  return {
    // Honour the requested range: the underwriter may split history into several ranges, and returning
    // every row for each one would count the same sale more than once.
    getLogs: async ({ fromBlock, toBlock }: { fromBlock: bigint; toBlock: bigint }) =>
      rows
        .filter((p) => BigInt(p.blockNumber) >= fromBlock && BigInt(p.blockNumber) <= toBlock)
        .map((p) => ({
        args: { payer: getAddress(p.payer), amount: BigInt(p.amount), repaid: BigInt(p.repaid), ref: p.ref as `0x${string}` },
        blockNumber: BigInt(p.blockNumber),
        transactionHash: p.txHash as `0x${string}`,
      })),
    getBlock: async ({ blockNumber }: { blockNumber: bigint }) => ({ timestamp: times.get(blockNumber) ?? 0n }),
  };
}
