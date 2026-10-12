import { defineChain, getAddress, type Address } from "viem";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 143);
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.monad.xyz";
export const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER_URL || "https://monadscan.com";

export const monad = defineChain({
  id: chainId,
  name: chainId === 143 ? "Monad" : `Monad (${chainId})`,
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: { default: { name: "Monadscan", url: explorerUrl } },
});

const addr = (v: string | undefined) => (v && /^0x[0-9a-fA-F]{40}$/.test(v) ? getAddress(v) : undefined);

export const addresses = {
  token: addr(process.env.NEXT_PUBLIC_TOKEN_ADDRESS) ?? ("0x754704Bc059F8C67012fEd69BC8A327a5aafb603" as Address),
  pool: addr(process.env.NEXT_PUBLIC_POOL_ADDRESS),
  router: addr(process.env.NEXT_PUBLIC_ROUTER_ADDRESS),
};

export const deployBlock = BigInt(process.env.NEXT_PUBLIC_POOL_DEPLOY_BLOCK || "0");

/** True once the pool and router are deployed and configured. */
export const isLive = Boolean(addresses.pool && addresses.router);

export const txUrl = (hash: string) => `${explorerUrl}/tx/${hash}`;
export const addressUrl = (a: string) => `${explorerUrl}/address/${a}`;
