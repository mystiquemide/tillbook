import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { quoteMerchant, toJson, type ReadClient } from "@tillbook/underwriter";
import { addresses, deployBlock, isLive, monad } from "@/lib/chain";
import { LOG_CHUNK, publicClient, underwriterKey } from "@/lib/server";

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
    const result = await quoteMerchant({
      client: publicClient as unknown as ReadClient,
      chainId: monad.id,
      pool: addresses.pool!,
      router: addresses.router!,
      merchant: address,
      underwriterKey: key,
      fromBlock: deployBlock,
      now: block.timestamp,
      chunkSize: LOG_CHUNK,
    });
    return NextResponse.json(toJson(result), { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("merchant quote failed", err);
    return NextResponse.json({ error: "rpc_unavailable" }, { status: 502 });
  }
}
