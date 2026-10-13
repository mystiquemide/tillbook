import "server-only";
import { createPublicClient, http, type Hex } from "viem";
import { monad } from "./chain";

// cacheTime 0: always read the newest block, so events from a transaction that just landed are included.
export const publicClient = createPublicClient({ chain: monad, transport: http(undefined, { retryCount: 6, retryDelay: 300 }), cacheTime: 0 });

export function underwriterKey(): Hex | null {
  const k = process.env.UNDERWRITER_PRIVATE_KEY;
  return k && /^0x[0-9a-fA-F]{64}$/.test(k) ? (k as Hex) : null;
}
