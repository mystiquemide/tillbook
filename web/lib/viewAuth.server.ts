import "server-only";
import { getAddress, type Hex } from "viem";
import { publicClient } from "./server";
import { VIEW_HEADERS, VIEW_TTL_SECONDS, viewMessage } from "./viewAuth";

/**
 * True when the request carries a fresh signature from `address` itself.
 * Uses the RPC's verifyMessage, so smart-contract wallets (ERC-1271) verify too.
 */
export async function ownsAddress(req: Request, address: string): Promise<boolean> {
  const expires = Number(req.headers.get(VIEW_HEADERS.expires));
  const signature = req.headers.get(VIEW_HEADERS.signature);
  if (!Number.isFinite(expires) || !signature || !/^0x[0-9a-fA-F]+$/.test(signature)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (expires < now || expires > now + VIEW_TTL_SECONDS + 300) return false;
  try {
    return await publicClient.verifyMessage({
      address: getAddress(address),
      message: viewMessage(address, expires),
      signature: signature as Hex,
    });
  } catch {
    return false;
  }
}
