import { NextResponse } from "next/server";
import { blockRanges } from "@tillbook/underwriter";
import { getAbiItem } from "viem";
import { poolAbi } from "@/lib/abi";
import { addresses, deployBlock, isLive } from "@/lib/chain";
import { LOG_CHUNK, publicClient } from "@/lib/server";

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

/** Every advance drawn from the pool, newest first, with its repayment status. */
export async function GET() {
  if (!isLive) return NextResponse.json({ error: "not_live" }, { status: 503 });
  try {
    const head = await publicClient.getBlockNumber();
    const drawn = getAbiItem({ abi: poolAbi, name: "AdvanceDrawn" });
    const repaidEv = getAbiItem({ abi: poolAbi, name: "AdvanceRepaid" });
    const rows: Row[] = [];
    const repaidTx = new Map<string, string[]>();

    for (const [fromBlock, toBlock] of blockRanges(deployBlock, head, LOG_CHUNK)) {
      const [d, r] = await Promise.all([
        publicClient.getLogs({ address: addresses.pool!, event: drawn, fromBlock, toBlock }),
        publicClient.getLogs({ address: addresses.pool!, event: repaidEv, fromBlock, toBlock }),
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
    return NextResponse.json({ advances: rows, head: head.toString() }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("advances read failed", err);
    return NextResponse.json({ error: "rpc_unavailable" }, { status: 502 });
  }
}
