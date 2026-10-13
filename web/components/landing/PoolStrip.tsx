"use client";

import { useQuery } from "@tanstack/react-query";
import { addressUrl, addresses, isLive } from "@/lib/chain";
import { usdc } from "@/lib/format";

type Stats = {
  totalAssets: string;
  outstanding: string;
  payments: number;
  volume: string;
  merchants: number;
  advances: number;
  advanced: string;
  repaid: number;
};

export function PoolStrip() {
  const stats = useQuery({
    queryKey: ["stats"],
    enabled: isLive,
    retry: 1,
    queryFn: async () => {
      const r = await fetch("/api/stats", { cache: "no-store" });
      if (!r.ok) throw new Error("rpc");
      return (await r.json()) as Stats;
    },
  });

  return (
    <section id="network" aria-labelledby="network-title" className="scroll-mt-20 px-3 pt-6 md:px-6">
      <div className="mx-auto max-w-[1392px] rounded-[32px] border border-hairline px-6 py-12 md:py-14">
        <h2 id="network-title" className="text-center text-[22px] font-[450] tracking-[-0.03em] md:text-[24px]">
          Live on Monad
        </h2>
        {!isLive ? (
          <p className="mx-auto mt-4 max-w-[520px] text-center text-[15px] leading-[1.6] text-ink-2">
            The pool opens when the Tillbook contracts go live on Monad mainnet. These numbers will read straight from
            the chain.
          </p>
        ) : stats.isError ? (
          <p className="mt-4 text-center text-[15px] text-ink-2">
            Can&apos;t reach Monad right now.{" "}
            <button type="button" onClick={() => stats.refetch()} className="text-primary-ink hover:underline">
              Try again
            </button>
          </p>
        ) : (
          <>
            <dl className="mx-auto mt-8 grid max-w-[960px] grid-cols-2 gap-y-8 md:grid-cols-4 md:divide-x md:divide-hairline">
              <Stat label="In the lender pool" value={stats.data && `${usdc(BigInt(stats.data.totalAssets))}`} unit="USDC" />
              <Stat label="Advanced to merchants" value={stats.data && usdc(BigInt(stats.data.advanced))} unit="USDC" />
              <Stat label="Sales paid through Tillbook" value={stats.data && stats.data.payments.toLocaleString("en-US")} />
              <Stat
                label="Advances repaid in full"
                value={stats.data && `${stats.data.repaid} of ${stats.data.advances}`}
              />
            </dl>
            <p className="mt-8 text-center text-[13px] text-ink-3">
              Read from{" "}
              <a href={addressUrl(addresses.pool!)} target="_blank" rel="noreferrer" className="hover:underline">
                LenderPool
              </a>{" "}
              and{" "}
              <a href={addressUrl(addresses.router!)} target="_blank" rel="noreferrer" className="hover:underline">
                SplitRouter
              </a>{" "}
              each time you load this page.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, unit }: { label: string; value: string | undefined; unit?: string }) {
  return (
    <div className="px-2 text-center md:px-6">
      <dd className="font-mono text-[28px] leading-[1.15] tracking-[-0.02em] text-primary md:text-[34px]">
        {value ?? <span className="text-[16px] text-ink-3">Reading...</span>}
        {unit && value && <span className="ml-1.5 font-sans text-[14px] tracking-normal text-ink-3">{unit}</span>}
      </dd>
      <dt className="mt-2 text-[14px] text-ink-2">{label}</dt>
    </div>
  );
}
