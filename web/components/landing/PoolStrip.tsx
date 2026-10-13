"use client";

import { useQuery } from "@tanstack/react-query";
import { addressUrl, addresses, isLive } from "@/lib/chain";
import Link from "next/link";
import { usdc } from "@/lib/format";
import { CountUp } from "@/components/motion/CountUp";

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
          <span className="inline-flex items-center gap-2.5">
            <span className="live-dot h-2 w-2 rounded-full bg-positive" aria-hidden="true" />
            Live on Monad
          </span>
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
              <Stat label="In the lender pool" value={stats.data && toUsdc(stats.data.totalAssets)} format={money} unit="USDC" />
              <Stat label="Advanced to merchants" value={stats.data && toUsdc(stats.data.advanced)} format={money} unit="USDC" />
              <Stat label="Sales paid through Tillbook" value={stats.data?.payments} format={whole} />
              <Stat
                label="Advances repaid in full"
                value={stats.data?.repaid}
                format={(n) => `${whole(n)} of ${stats.data?.advances ?? 0}`}
              />
            </dl>
            {stats.data && stats.data.payments === 0 && BigInt(stats.data.totalAssets) === 0n && (
              <p className="mx-auto mt-8 max-w-[620px] rounded-[16px] bg-surface px-5 py-4 text-center text-[15px] leading-[1.6] text-ink-2">
                Tillbook is newly live on Monad mainnet. The first lender deposit opens the pool for the first merchant
                advance. Until then, you can{" "}
                <Link href="/proof" className="text-primary-ink hover:underline">
                  check the contracts live
                </Link>{" "}
                and see the full loop run on a mainnet fork in the screenshots above.
              </p>
            )}
            <p className="mt-8 text-center text-[13px] text-ink-3">
              Read from{" "}
              <a href={addressUrl(addresses.pool!)} target="_blank" rel="noreferrer" className="hover:underline">
                LenderPool
              </a>{" "}
              and{" "}
              <a href={addressUrl(addresses.router!)} target="_blank" rel="noreferrer" className="hover:underline">
                SplitRouter
              </a>{" "}
              on Monad, refreshed every few seconds.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

const toUsdc = (raw: string) => Number(BigInt(raw)) / 1e6;
const money = (n: number) => usdc(BigInt(Math.round(n * 1e6)));
const whole = (n: number) => Math.round(n).toLocaleString("en-US");

function Stat({ label, value, format, unit }: { label: string; value: number | undefined; format: (n: number) => string; unit?: string }) {
  return (
    <div className="px-2 text-center md:px-6">
      <dd className="font-mono text-[28px] leading-[1.15] tracking-[-0.02em] text-primary tabular-nums md:text-[34px]">
        {value === undefined ? <span className="text-[16px] text-ink-3">Reading...</span> : <CountUp value={value} format={format} />}
        {unit && value !== undefined && <span className="ml-1.5 font-sans text-[14px] tracking-normal text-ink-3">{unit}</span>}
      </dd>
      <dt className="mt-2 text-[14px] text-ink-2">{label}</dt>
    </div>
  );
}
