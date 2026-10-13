import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { walletHistory } from "@/lib/history";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** USDC history for one wallet since Tillbook launched. Public data, read straight from the chain. */
export async function GET(_req: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!isAddress(address)) return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  try {
    const items = await walletHistory(getAddress(address));
    return NextResponse.json({ items }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("wallet history failed", err);
    return NextResponse.json({ error: "rpc_unavailable" }, { status: 502 });
  }
}
