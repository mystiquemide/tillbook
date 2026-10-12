"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { NotLive, Notice } from "@/components/app/Notice";
import { TxStatus } from "@/components/app/TxStatus";
import { poolAbi } from "@/lib/abi";
import { addresses, isLive, monad, txUrl } from "@/lib/chain";
import { date, short, usdc } from "@/lib/format";
import { ApiError, fetchMerchant, type ApiInputs, type MerchantResponse } from "@/lib/merchantApi";
import { useTx } from "@/lib/useTx";

export function MerchantDashboard() {
  const { address, isConnected, chainId } = useAccount();

  if (!isLive) return <NotLive />;
  if (!isConnected || !address)
    return (
      <Intro>
        <Notice title="Connect the wallet you get paid to.">
          Your ledger and your offer are read from Monad for that address. Use the button at the top right.
        </Notice>
      </Intro>
    );
  if (chainId !== monad.id)
    return (
      <Intro>
        <Notice title="Your wallet is on another network." tone="warning">
          Switch to Monad with the button at the top right.
        </Notice>
      </Intro>
    );
  return <Connected address={address} />;
}

function Intro({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-8">
      <Heading />
      {children}
    </div>
  );
}

function Heading() {
  return (
    <div>
      <h1 className="text-[40px] leading-[1.2] font-[500] tracking-[-0.03em]">Your ledger</h1>
      <p className="mt-2 text-[16px] text-ink-2">Every sale paid through Tillbook, straight from Monad.</p>
    </div>
  );
}

function Connected({ address }: { address: `0x${string}` }) {
  const data = useQuery({
    queryKey: ["merchant", address],
    queryFn: () => fetchMerchant(address),
    retry: 1,
  });
  const chain = useReadContracts({
    contracts: [
      { address: addresses.pool!, abi: poolAbi, functionName: "advanceOf", args: [address] },
      { address: addresses.pool!, abi: poolAbi, functionName: "repaidCount", args: [address] },
    ],
  });
  const refresh = () => Promise.all([data.refetch(), chain.refetch()]);
  const tx = useTx();

  const advance = chain.data?.[0]?.result;
  const repaidCount = chain.data?.[1]?.result;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Heading />
        <PayLink address={address} />
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="ledger-title" className="min-w-0">
          <h2 id="ledger-title" className="sr-only">
            Sales ledger
          </h2>
          <Ledger query={data} />
        </section>
        <aside aria-label="Advance" className="order-first min-w-0 lg:order-none">
          {data.isError || chain.isError ? (
            <Notice title="Can't reach Monad right now." tone="error">
              <button type="button" onClick={refresh} className="mt-2 rounded-full bg-ink px-4 py-2 text-[14px] text-white">
                Try again
              </button>
            </Notice>
          ) : advance === undefined || data.isLoading ? (
            <Reading />
          ) : advance.active ? (
            <Repaying owed={advance.owed} principal={advance.principal} bps={advance.holdbackBps} />
          ) : (
            <OfferPanel tx={tx} response={data.data!} repaidCount={repaidCount ?? 0n} onDrawn={refresh} onRefresh={() => data.refetch()} />
          )}
          <div className="mt-3">
            <TxStatus state={tx.state} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Reading() {
  return <p className="py-6 text-[15px] text-ink-2">Reading from Monad...</p>;
}

function PayLink({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(`/pay/${address}`);
  useEffect(() => setUrl(`${window.location.origin}/pay/${address}`), [address]);
  return (
    <div className="flex items-center gap-2">
      <code className="hidden max-w-[320px] truncate rounded-full bg-surface px-4 py-2 font-mono text-[13px] text-ink-2 ring-1 ring-hairline sm:block">
        pay/{short(address)}
      </code>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        className="h-10 rounded-full bg-primary-tint px-5 text-[15px] font-[450] text-primary-ink hover:bg-[rgba(110,84,255,0.16)]"
      >
        {copied ? "Copied" : "Copy payment link"}
      </button>
    </div>
  );
}

const PAGE = 12;

function Ledger({ query }: { query: ReturnType<typeof useQuery<MerchantResponse>> }) {
  const [showAll, setShowAll] = useState(false);
  if (query.isLoading) return <Reading />;
  if (query.isError) {
    const code = query.error instanceof ApiError ? query.error.code : "";
    if (code === "underwriter_not_configured")
      return <Notice title="Offers are offline." tone="warning">The underwriter key isn&apos;t configured on this server.</Notice>;
    return null;
  }
  const all = [...(query.data?.payments ?? [])].reverse();
  if (all.length === 0)
    return <Notice title="No sales yet.">Share your payment link to start your record. Every sale you take through it shows up here.</Notice>;

  const payments = showAll ? all : all.slice(0, PAGE);
  return (
    <div>
      <ul className="divide-y divide-hairline border-y border-hairline sm:hidden">
        {payments.map((p) => (
          <li key={p.txHash + p.payer + p.amount} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="font-mono text-[13px]">{short(p.payer)}</p>
              <p className="text-[13px] text-ink-3">{date(p.timestamp)}</p>
            </div>
            <div className="text-right">
              <a href={txUrl(p.txHash)} target="_blank" rel="noreferrer" className="font-mono text-[15px] hover:underline">
                {usdc(BigInt(p.amount))}
              </a>
              <p className={`font-mono text-[12px] ${BigInt(p.repaid) > 0n ? "text-primary-ink" : "text-ink-3"}`}>
                {BigInt(p.repaid) > 0n ? `${usdc(BigInt(p.repaid))} repaid` : "no repayment"}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
      <table className="w-full min-w-[560px] text-left text-[14px]">
        <thead>
          <tr className="border-b border-hairline text-[13px] text-ink-3">
            <th className="py-3 font-[450]">Date</th>
            <th className="py-3 font-[450]">Customer</th>
            <th className="py-3 text-right font-[450]">Amount</th>
            <th className="py-3 text-right font-[450]">Repaid</th>
            <th className="py-3 text-right font-[450]">Tx</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.txHash + p.payer + p.amount} className="border-b border-hairline">
              <td className="py-3 text-ink-2">{date(p.timestamp)}</td>
              <td className="py-3 font-mono text-[13px]">{short(p.payer)}</td>
              <td className="py-3 text-right font-mono">{usdc(BigInt(p.amount))}</td>
              <td className={`py-3 text-right font-mono ${BigInt(p.repaid) > 0n ? "text-primary-ink" : "text-ink-3"}`}>
                {BigInt(p.repaid) > 0n ? usdc(BigInt(p.repaid)) : "0.00"}
              </td>
              <td className="py-3 text-right">
                <a href={txUrl(p.txHash)} target="_blank" rel="noreferrer" className="font-mono text-[13px] text-primary-ink hover:underline">
                  {p.txHash.slice(0, 8)}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="text-[13px] text-ink-3">
          {all.length} {all.length === 1 ? "sale" : "sales"}. Amounts in USDC.
        </p>
        {all.length > PAGE && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="text-[14px] text-primary-ink hover:underline">
            {showAll ? "Show latest" : `Show all ${all.length}`}
          </button>
        )}
      </div>
    </div>
  );
}

const reasons: Record<string, { title: string; body: (i: ApiInputs | null) => string }> = {
  too_few_payers: {
    title: "No offer yet.",
    body: (i) => `Offers start at 3 different customers in the last 30 days. You have ${i?.distinctPayers ?? 0}.`,
  },
  no_volume: { title: "No offer yet.", body: () => "Your recent sales are too small to price an advance." },
  pool_empty: { title: "No lender funds available right now.", body: () => "Your record is ready. Check back once lenders deposit." },
  advance_active: { title: "You have an advance open.", body: () => "It's being repaid from your sales." },
};

function OfferPanel({
  tx,
  response,
  repaidCount,
  onDrawn,
  onRefresh,
}: {
  tx: ReturnType<typeof useTx>;
  response: MerchantResponse;
  repaidCount: bigint;
  onDrawn: () => void;
  onRefresh: () => void;
}) {
  const { state, send, reset } = tx;
  const now = useNow();

  if (!response.eligible) {
    const r = reasons[response.reason]!;
    return (
      <Panel>
        <p className="text-[17px] font-[450]">{r.title}</p>
        <p className="mt-2 text-[15px] leading-[1.6] text-ink-2">{r.body(response.inputs)}</p>
        {repaidCount > 0n && <Repaid count={repaidCount} />}
        {response.inputs && <Breakdown inputs={response.inputs} />}
      </Panel>
    );
  }

  const { offer, signature, inputs } = response;
  const secondsLeft = Number(offer.expiry) - now;
  const expired = secondsLeft <= 0;
  const busy = state.status === "signing" || state.status === "pending";

  return (
    <Panel>
      <p className="text-[14px] text-ink-2">Your offer</p>
      <p className="mt-1 font-mono text-[40px] leading-[1.1] tracking-[-0.02em]">{usdc(BigInt(offer.amount))}</p>
      <p className="mt-1 text-[14px] text-ink-2">
        USDC. Fee <span className="font-mono">{usdc(BigInt(offer.fee))}</span>. Repaid from{" "}
        <span className="font-mono">{offer.holdbackBps / 100}%</span> of each sale.
      </p>
      {repaidCount > 0n && <Repaid count={repaidCount} />}
      <Breakdown inputs={inputs} />
      {expired ? (
        <button type="button" onClick={() => { reset(); onRefresh(); }} className="mt-6 h-12 w-full rounded-full bg-primary-tint text-[16px] font-[450] text-primary-ink">
          Offer expired. Get a fresh offer
        </button>
      ) : (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const ok = await send("Draw advance", {
                address: addresses.pool!,
                abi: poolAbi,
                functionName: "requestAdvance",
                args: [
                  {
                    merchant: offer.merchant,
                    amount: BigInt(offer.amount),
                    fee: BigInt(offer.fee),
                    holdbackBps: offer.holdbackBps,
                    nonce: BigInt(offer.nonce),
                    expiry: BigInt(offer.expiry),
                  },
                  signature,
                ],
              });
              if (ok) onDrawn();
            }}
            className="mt-6 h-12 w-full rounded-full bg-primary text-[16px] font-[450] text-white hover:bg-primary-ink disabled:opacity-60"
          >
            {busy ? "Drawing..." : `Draw ${usdc(BigInt(offer.amount))} USDC`}
          </button>
          <p className="mt-2 text-center text-[13px] text-ink-3">
            Offer expires in{" "}
            <span className="font-mono">
              {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
            </span>
          </p>
        </>
      )}
    </Panel>
  );
}

function Repaying({ owed, principal, bps }: { owed: bigint; principal: bigint; bps: number }) {
  return (
    <Panel>
      <p className="text-[14px] text-ink-2">Still owed</p>
      <p className="mt-1 font-mono text-[40px] leading-[1.1] tracking-[-0.02em]">{usdc(owed)}</p>
      <p className="mt-1 text-[14px] text-ink-2">
        USDC, of which <span className="font-mono">{usdc(principal)}</span> is principal.
      </p>
      <p className="mt-6 text-[15px] leading-[1.6] text-ink-2">
        <span className="font-mono text-ink">{bps / 100}%</span> of every sale through your payment link goes to lenders
        until this reaches zero. Nothing else to do.
      </p>
    </Panel>
  );
}

function Repaid({ count }: { count: bigint }) {
  return (
    <p className="mt-4 text-[14px] text-positive">
      {count.toString()} {count === 1n ? "advance" : "advances"} repaid in full.
    </p>
  );
}

function Breakdown({ inputs }: { inputs: ApiInputs }) {
  const rows: [string, string][] = [
    ["Sales, last 30 days", usdc(BigInt(inputs.volume))],
    ["Counted (20% per customer)", usdc(BigInt(inputs.cappedVolume))],
    ["Different customers", String(inputs.distinctPayers)],
    ["Advances repaid", `${inputs.repaidCount} (${(Number(inputs.boostBps) / 10_000).toFixed(2)}x)`],
    ["Lender funds available", usdc(BigInt(inputs.poolIdle))],
  ];
  return (
    <div className="mt-6 border-t border-hairline pt-4">
      <p className="mb-2 text-[13px] text-ink-3">How this is worked out</p>
      <dl className="space-y-2 text-[14px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-ink-2">{k}</dt>
            <dd className="font-mono">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[13px] leading-[1.5] text-ink-3">
        Offer is 50% of counted sales, times the repayment boost, up to 5,000 USDC.
      </p>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[16px] border border-hairline bg-white p-6">{children}</div>;
}

function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}
