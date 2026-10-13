import { NextResponse } from "next/server";
import { getAbiItem, getAddress } from "viem";
import { poolAbi } from "@/lib/abi";
import { addresses, deployBlock, isLive } from "@/lib/chain";
import { publicClient } from "@/lib/server";
import { cachedLogs } from "@/lib/logs";
import { fromIndexer, indexer } from "@/lib/indexer";

export const dynamic = "force-dynamic";

type Row = {
  merchant: string;
  amount: string;
  fee: string;
  holdbackBps: number;
  blockNumber: string;
  txHash: string;
  repaid: boolean;
  repaidTx: string | null;
};

/**
 * What the public sees of each advance: its place in the sequence and whether it's repaid.
 * Merchant, amount, fee and transaction stay out of the response so the list can't be used to look anyone up.
 */
function redact(rows: Row[]) {
  return rows.map((r, i) => ({ n: rows.length - i, repaid: r.repaid }));
}

/** Every advance drawn from the pool, newest first, with its repayment status. */
export async function GET() {
  if (!isLive) return NextResponse.json({ error: "not_live" }, { status: 503 });
  try {
    const head = await publicClient.getBlockNumber();
    const indexed = await fromIndexer(head, () => indexer.advances());
    if (indexed !== null) {
      const rows: Row[] = indexed.map((a) => ({
        merchant: getAddress(a.merchant),
        amount: a.amount,
        fee: a.fee,
        holdbackBps: a.holdbackBps,
        blockNumber: a.blockNumber,
        txHash: a.txHash,
        repaid: a.repaid,
        repaidTx: a.repaidTxHash,
      }));
      return NextResponse.json(
        { advances: redact(rows), head: head.toString() },
        { headers: { "cache-control": "no-store", "x-data-source": "envio" } },
      );
    }
    const drawn = getAbiItem({ abi: poolAbi, name: "AdvanceDrawn" });
    const repaidEv = getAbiItem({ abi: poolAbi, name: "AdvanceRepaid" });
    const rows: Row[] = [];
    const repaidTx = new Map<string, string[]>();

    for (const [fromBlock, toBlock] of [[deployBlock, head]] as const) {
      const [d, r] = await Promise.all([
        cachedLogs({ address: addresses.pool!, event: drawn, fromBlock, toBlock }),
        cachedLogs({ address: addresses.pool!, event: repaidEv, fromBlock, toBlock }),
      ]);
      for (const l of d) {
        rows.push({
          merchant: l.args.merchant!,
          amount: l.args.amount!.toString(),
          fee: l.args.fee!.toString(),
          holdbackBps: Number(l.args.holdbackBps),
          blockNumber: l.blockNumber.toString(),
          txHash: l.transactionHash,
          repaid: false,
          repaidTx: null,
        });
      }
      for (const l of r) {
        const k = l.args.merchant!.toLowerCase();
        repaidTx.set(k, [...(repaidTx.get(k) ?? []), l.transactionHash]);
      }
    }

    // Advances for one merchant are sequential, so the n-th repayment closes the n-th advance.
    const seen = new Map<string, number>();
    for (const row of rows) {
      const k = row.merchant.toLowerCase();
      const i = seen.get(k) ?? 0;
      seen.set(k, i + 1);
      const tx = repaidTx.get(k)?.[i];
      if (tx) {
        row.repaid = true;
        row.repaidTx = tx;
      }
    }

    rows.reverse();
    return NextResponse.json({ advances: redact(rows), head: head.toString() }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("advances read failed", err);
    return NextResponse.json({ error: "rpc_unavailable" }, { status: 502 });
  }
}
