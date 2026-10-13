import "server-only";
import { createPublicClient, fallback, http, type Hex } from "viem";
import { monad } from "./chain";

// cacheTime 0: always read the newest block, so events from a transaction that just landed are included.
// Server reads go to Alchemy when configured (SERVER_RPC_URL), and fall back to the public Monad RPC if it fails.
const retry = { retryCount: 6, retryDelay: 300 };
const serverRpc = process.env.SERVER_RPC_URL;
export const publicClient = createPublicClient({
  chain: monad,
  transport: serverRpc ? fallback([http(serverRpc, retry), http(undefined, retry)]) : http(undefined, retry),
  cacheTime: 0,
});

export function underwriterKey(): Hex | null {
  const k = process.env.UNDERWRITER_PRIVATE_KEY;
  return k && /^0x[0-9a-fA-F]{64}$/.test(k) ? (k as Hex) : null;
}
