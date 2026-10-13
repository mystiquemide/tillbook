import { NextResponse } from "next/server";
import { getAbiItem, getAddress, isAddress } from "viem";
import { poolAbi } from "@/lib/abi";
import { addresses, deployBlock, isLive } from "@/lib/chain";
import { publicClient } from "@/lib/server";
import { cachedLogs } from "@/lib/logs";

export const dynamic = "force-dynamic";

/** Net USDC a lender has put into the pool: deposits credited to them minus withdrawals from their shares. */
export async function GET(_req: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!isAddress(address)) return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  if (!isLive) return NextResponse.json({ error: "not_live" }, { status: 503 });
  const owner = getAddress(address);
  try {
    const head = await publicClient.getBlockNumber();
    const dep = getAbiItem({ abi: poolAbi, name: "Deposit" });
    const wd = getAbiItem({ abi: poolAbi, name: "Withdraw" });
    let deposited = 0n;
    let withdrawn = 0n;
    for (const [fromBlock, toBlock] of [[deployBlock, head]] as const) {
      const [d, w] = await Promise.all([
        cachedLogs({ address: addresses.pool!, event: dep, args: { owner }, fromBlock, toBlock }),
        cachedLogs({ address: addresses.pool!, event: wd, args: { owner }, fromBlock, toBlock }),
      ]);
      for (const l of d) deposited += l.args.assets!;
      for (const l of w) withdrawn += l.args.assets!;
    }
    return NextResponse.json(
      { deposited: deposited.toString(), withdrawn: withdrawn.toString() },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    console.error("lender read failed", err);
    return NextResponse.json({ error: "rpc_unavailable" }, { status: 502 });
  }
}
