import "server-only";
import { monad } from "./chain";

/** Envio HyperIndex GraphQL endpoint. When unset, or when the indexer is behind, routes read history from the RPC instead. */
const url = process.env.ENVIO_GRAPHQL_URL;
/** How far behind the chain head the indexer may be before we stop trusting it (about 10 seconds on Monad). */
const MAX_LAG = 25n;

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch(url!, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
    signal: AbortSignal.timeout(4_000),
  });
  if (!r.ok) throw new Error(`indexer ${r.status}`);
  const body = (await r.json()) as { data?: T; errors?: unknown };
  if (body.errors || !body.data) throw new Error("indexer query failed");
  return body.data;
}

/** Runs `read` against the indexer if it's configured and caught up to `head`. Returns null so the caller can fall back. */
export async function fromIndexer<T>(head: bigint, read: () => Promise<T>): Promise<T | null> {
  if (!url) return null;
  try {
    const meta = await gql<{ _meta: { chainId: number; progressBlock: number }[] }>("{ _meta { chainId progressBlock } }");
    const chain = meta._meta.find((m) => Number(m.chainId) === monad.id);
    if (!chain || BigInt(chain.progressBlock) < head - MAX_LAG) return null;
    return await read();
  } catch (err) {
    console.warn("indexer unavailable, reading from RPC", err instanceof Error ? err.message : err);
    return null;
  }
}

export type IndexedPayment = {
  payer: string;
  amount: string;
  repaid: string;
  ref: string;
  blockNumber: string;
  timestamp: string;
  txHash: string;
};

export const indexer = {
  async payments(merchant: string) {
    const d = await gql<{ Payment: IndexedPayment[] }>(
      `query ($m: String!) { Payment(where: { merchant: { _eq: $m } }, order_by: { blockNumber: asc }) {
        payer amount repaid ref blockNumber timestamp txHash } }`,
      { m: merchant.toLowerCase() },
    );
    return d.Payment;
  },
  async advances() {
    const d = await gql<{
      Advance: { merchant: string; amount: string; fee: string; holdbackBps: number; blockNumber: string; txHash: string; repaid: boolean; repaidTxHash: string | null }[];
    }>(`{ Advance(order_by: { blockNumber: desc }) { merchant amount fee holdbackBps blockNumber txHash repaid repaidTxHash } }`);
    return d.Advance;
  },
  async totals() {
    const d = await gql<{
      Totals_by_pk: { payments: number; volume: string; merchants: number; advances: number; advanced: string; advancesRepaid: number } | null;
    }>(`{ Totals_by_pk(id: "global") { payments volume merchants advances advanced advancesRepaid } }`);
    return d.Totals_by_pk;
  },
  async lender(owner: string) {
    const d = await gql<{ Lender_by_pk: { deposited: string; withdrawn: string } | null }>(
      `query ($id: String!) { Lender_by_pk(id: $id) { deposited withdrawn } }`,
      { id: owner.toLowerCase() },
    );
    return d.Lender_by_pk;
  },
};
