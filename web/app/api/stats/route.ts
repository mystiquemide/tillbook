import { NextResponse } from "next/server";
import { getAbiItem } from "viem";
import { poolAbi, routerAbi } from "@/lib/abi";
import { addresses, deployBlock, isLive } from "@/lib/chain";
import { publicClient } from "@/lib/server";
import { cachedLogs } from "@/lib/logs";
import { fromIndexer, indexer } from "@/lib/indexer";

export const dynamic = "force-dynamic";

/** Network-wide totals for the landing page, read from the pool and router. */
export async function GET() {
  if (!isLive) return NextResponse.json({ error: "not_live" }, { status: 503 });
  try {
    const pool = addresses.pool!;
    const [head, totalAssets, outstanding] = await Promise.all([
      publicClient.getBlockNumber(),
      publicClient.readContract({ address: pool, abi: poolAbi, functionName: "totalAssets" }),
      publicClient.readContract({ address: pool, abi: poolAbi, functionName: "principalOutstanding" }),
    ]);
    const cache = { "cache-control": "public, s-maxage=10, stale-while-revalidate=300" };
    const indexed = await fromIndexer(head, () => indexer.totals());
    if (indexed !== null)
      return NextResponse.json(
        {
          totalAssets: totalAssets.toString(),
          outstanding: outstanding.toString(),
          payments: indexed?.payments ?? 0,
          volume: indexed?.volume ?? "0",
          merchants: indexed?.merchants ?? 0,
          advances: indexed?.advances ?? 0,
          advanced: indexed?.advanced ?? "0",
          repaid: indexed?.advancesRepaid ?? 0,
        },
        { headers: { ...cache, "x-data-source": "envio" } },
      );

    const paymentEv = getAbiItem({ abi: routerAbi, name: "Payment" });
    const drawnEv = getAbiItem({ abi: poolAbi, name: "AdvanceDrawn" });
    const repaidEv = getAbiItem({ abi: poolAbi, name: "AdvanceRepaid" });

    let payments = 0;
    let volume = 0n;
    let advances = 0;
    let advanced = 0n;
    let repaid = 0;
    const merchants = new Set<string>();

    for (const [fromBlock, toBlock] of [[deployBlock, head]] as const) {
      const [p, d, r] = await Promise.all([
        cachedLogs({ address: addresses.router!, event: paymentEv, fromBlock, toBlock }),
        cachedLogs({ address: pool, event: drawnEv, fromBlock, toBlock }),
        cachedLogs({ address: pool, event: repaidEv, fromBlock, toBlock }),
      ]);
      for (const l of p) {
        payments++;
        volume += l.args.amount!;
        merchants.add(l.args.merchant!.toLowerCase());
      }
      for (const l of d) {
        advances++;
        advanced += l.args.amount!;
      }
      repaid += r.length;
    }

    return NextResponse.json(
      {
        totalAssets: totalAssets.toString(),
        outstanding: outstanding.toString(),
        payments,
        volume: volume.toString(),
        merchants: merchants.size,
        advances,
        advanced: advanced.toString(),
        repaid,
      },
      // Landing page totals: served from the CDN for 10s and refreshed in the background, so a cold server never blocks the page.
      { headers: { "cache-control": "public, s-maxage=10, stale-while-revalidate=300" } },
    );
  } catch (err) {
    console.error("stats read failed", err);
    return NextResponse.json({ error: "rpc_unavailable" }, { status: 502 });
  }
}
