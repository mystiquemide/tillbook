"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useReadContracts } from "wagmi";
import { Notice } from "@/components/app/Notice";
import { PageHeader } from "@/components/app/PageHeader";
import { ScrollText } from "lucide-react";
import { Breakdown, Ledger, Panel, Reading } from "@/app/merchant/MerchantDashboard";
import { poolAbi } from "@/lib/abi";
import { addressUrl, addresses } from "@/lib/chain";
import { usdc } from "@/lib/format";
import { fetchMerchant } from "@/lib/merchantApi";

const standing: Record<string, string> = {
  too_few_payers: "Doesn't qualify yet. Offers start at 3 different customers in the last 30 days.",
  no_volume: "Doesn't qualify yet. Recent sales are too small to price an advance.",
  pool_empty: "Qualifies once lenders deposit. The pool has no free USDC right now.",
  advance_active: "Has an advance open, repaying from each sale.",
};

/** Anyone can read a merchant's record: sales, repayments and how their offer is priced. */
export function MerchantRecord({ address }: { address: `0x${string}` }) {
  const data = useQuery({ queryKey: ["merchant", address], queryFn: () => fetchMerchant(address), retry: 1 });
  const chain = useReadContracts({
    contracts: [
      { address: addresses.pool!, abi: poolAbi, functionName: "advanceOf", args: [address] },
      { address: addresses.pool!, abi: poolAbi, functionName: "repaidCount", args: [address] },
    ],
  });
  const advance = chain.data?.[0]?.result;
  const repaidCount = chain.data?.[1]?.result;
  const failed = data.isError || chain.isError;

  return (
    <div className="space-y-10">
      <PageHeader
        icon={ScrollText}
        eyebrow="Public record"
        title="Merchant record"
        description={
          <a
            href={addressUrl(address)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[14px] break-all hover:text-ink hover:underline"
          >
            {address}
          </a>
        }
        actions={
          <Link
            href={`/pay/${address}`}
            className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-[15px] font-[450] text-white hover:bg-primary-ink"
          >
            Pay this merchant
          </Link>
        }
      />

      {failed ? (
        <Notice title="Can't reach Monad right now." tone="error">
          <button
            type="button"
            onClick={() => Promise.all([data.refetch(), chain.refetch()])}
            className="mt-2 rounded-full bg-ink px-4 py-2 text-[14px] text-white"
          >
            Try again
          </button>
        </Notice>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <section aria-labelledby="ledger-title" className="min-w-0">
            <h2 id="ledger-title" className="mb-4 text-[20px] font-[450] tracking-[-0.01em]">
              Sales through Tillbook
            </h2>
            <Ledger
              query={data}
              empty={<Notice title="No sales yet.">This address hasn&apos;t been paid through Tillbook.</Notice>}
            />
          </section>
          <aside aria-label="Credit standing" className="order-first min-w-0 lg:order-none">
            {advance === undefined || data.isLoading || !data.data ? (
              <Reading />
            ) : (
              <Panel>
                <p className="text-[14px] text-ink-2">Credit standing</p>
                {advance.active ? (
                  <>
                    <p className="mt-1 font-mono text-[32px] leading-[1.1] tracking-[-0.02em]">{usdc(advance.owed)}</p>
                    <p className="mt-1 text-[14px] text-ink-2">USDC still owed on an open advance.</p>
                  </>
                ) : data.data.eligible ? (
                  <>
                    <p className="mt-1 font-mono text-[32px] leading-[1.1] tracking-[-0.02em]">
                      {usdc(BigInt(data.data.offer.amount))}
                    </p>
                    <p className="mt-1 text-[14px] text-ink-2">USDC advance this merchant qualifies for today.</p>
                  </>
                ) : (
                  <p className="mt-2 text-[15px] leading-[1.6]">{standing[data.data.reason]}</p>
                )}
                <p className="mt-4 text-[14px] text-ink-2">
                  Advances repaid in full: <span className="font-mono text-ink">{(repaidCount ?? 0n).toString()}</span>
                </p>
                {data.data.inputs && <Breakdown inputs={data.data.inputs} />}
              </Panel>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
