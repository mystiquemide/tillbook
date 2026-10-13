"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ExternalLink, Loader2, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { isAddressEqual, zeroAddress, type Address } from "viem";
import { useBytecode, useReadContracts } from "wagmi";
import { Reveal } from "@/components/motion/Reveal";
import { poolAbi, routerAbi } from "@/lib/abi";
import { addressUrl, addresses, txUrl } from "@/lib/chain";
import { short, usdc } from "@/lib/format";
import { links } from "@/lib/links";

const sourcify = (a: string) => `https://sourcify.dev/#/lookup/${a}`;
const CAP = 5_000_000_000n;

type Status = "pass" | "fail" | "loading";
type Row = { claim: string; detail: ReactNode; status: Status; links: { label: string; href: string }[] };

/** Every claim on this page is re-checked against Monad in the visitor's browser. */
export function ProofBoard() {
  const pool = addresses.pool!;
  const router = addresses.router!;
  const poolCode = useBytecode({ address: pool });
  const routerCode = useBytecode({ address: router });
  const reads = useReadContracts({
    contracts: [
      { address: pool, abi: poolAbi, functionName: "asset" },
      { address: pool, abi: poolAbi, functionName: "underwriter" },
      { address: pool, abi: poolAbi, functionName: "maxAdvance" },
      { address: pool, abi: poolAbi, functionName: "totalAssets" },
      { address: pool, abi: poolAbi, functionName: "idle" },
      { address: pool, abi: poolAbi, functionName: "principalOutstanding" },
      { address: router, abi: routerAbi, functionName: "pool" },
      { address: router, abi: routerAbi, functionName: "token" },
    ],
  });
  const r = reads.data?.map((x) => x.result);
  const [asset, signer, cap, total, idle, out, routerPool, routerToken] = (r ?? []) as [
    Address?, Address?, bigint?, bigint?, bigint?, bigint?, Address?, Address?,
  ];

  const status = (ready: boolean, ok: boolean): Status => (!ready ? "loading" : ok ? "pass" : "fail");
  const bytes = (code: string | undefined) => (code ? (code.length - 2) / 2 : 0);

  const rows: Row[] = [
    {
      claim: "LenderPool is deployed on Monad mainnet",
      detail: poolCode.data ? `${bytes(poolCode.data).toLocaleString("en-US")} bytes of verified code at ${short(pool)}` : "Reading...",
      status: status(poolCode.isFetched, bytes(poolCode.data) > 0),
      links: [
        { label: "Monadscan", href: addressUrl(pool) },
        { label: "Sourcify", href: sourcify(pool) },
        { label: "Source", href: `${links.repo}/blob/main/contracts/src/LenderPool.sol` },
      ],
    },
    {
      claim: "SplitRouter is deployed on Monad mainnet",
      detail: routerCode.data ? `${bytes(routerCode.data).toLocaleString("en-US")} bytes of verified code at ${short(router)}` : "Reading...",
      status: status(routerCode.isFetched, bytes(routerCode.data) > 0),
      links: [
        { label: "Monadscan", href: addressUrl(router) },
        { label: "Sourcify", href: sourcify(router) },
        { label: "Source", href: `${links.repo}/blob/main/contracts/src/SplitRouter.sol` },
      ],
    },
    {
      claim: "The pool holds native USDC, nothing else",
      detail: asset ? `asset() returns ${short(asset)}, Circle's USDC on Monad` : "Reading...",
      status: status(!!asset, !!asset && isAddressEqual(asset, addresses.token)),
      links: [{ label: "USDC", href: addressUrl(addresses.token) }],
    },
    {
      claim: "The router pays into this pool, in the same USDC",
      detail: routerPool && routerToken ? `pool() is ${short(routerPool)} and token() is ${short(routerToken)}` : "Reading...",
      status: status(
        !!routerPool && !!routerToken,
        !!routerPool && !!routerToken && isAddressEqual(routerPool, pool) && isAddressEqual(routerToken, addresses.token),
      ),
      links: [{ label: "Router", href: addressUrl(router) }],
    },
    {
      claim: "No advance can exceed 5,000 USDC",
      detail: cap !== undefined ? `maxAdvance() returns ${usdc(cap)} USDC, fixed at deploy` : "Reading...",
      status: status(cap !== undefined, cap === CAP),
      links: [{ label: "Code", href: `${links.repo}/blob/main/contracts/src/LenderPool.sol` }],
    },
    {
      claim: "Offers are signed by one fixed key, which can't move funds",
      detail: signer ? `underwriter() is ${short(signer)}. It can only sign offers, never withdraw.` : "Reading...",
      status: status(!!signer, !!signer && !isAddressEqual(signer, zeroAddress)),
      links: signer ? [{ label: "Signer", href: addressUrl(signer) }] : [],
    },
    {
      claim: "Every USDC in the pool is accounted for",
      detail:
        total !== undefined && idle !== undefined && out !== undefined
          ? `${usdc(total)} total = ${usdc(idle)} free + ${usdc(out)} lent out`
          : "Reading...",
      status: status(total !== undefined && idle !== undefined && out !== undefined, total === (idle ?? 0n) + (out ?? 0n)),
      links: [{ label: "Pool", href: addressUrl(pool) }],
    },
  ];

  const passed = rows.filter((x) => x.status === "pass").length;

  return (
    <div className="space-y-20">
      <Reveal as="section" aria-labelledby="checks-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="checks-title" className="text-[28px] leading-[1.15] font-[550] tracking-[-0.03em]">
              Live contract checks
            </h2>
            <p className="mt-2 text-[15px] text-ink-2">Read from Monad mainnet just now, in your browser.</p>
          </div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] ring-1 ring-hairline">
            <span className="live-dot h-2 w-2 rounded-full bg-positive" aria-hidden="true" />
            <span className="font-mono">{passed}</span> of <span className="font-mono">{rows.length}</span> passing
          </p>
        </div>
        <ul className="mt-6 divide-y divide-hairline overflow-hidden rounded-[20px] border border-hairline bg-white">
          {rows.map((row) => (
            <li key={row.claim} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:gap-5 md:p-6">
              <StatusIcon status={row.status} />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-[450]">{row.claim}</p>
                <p className="mt-1 font-mono text-[13px] break-words text-ink-2">{row.detail}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {row.links.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center gap-1 rounded-full bg-surface px-3 text-[13px] text-ink-2 ring-1 ring-hairline transition-colors hover:text-ink"
                  >
                    {l.label}
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Reveal>

      <Activity />

      <Reveal as="section" aria-labelledby="tests-title" className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 id="tests-title" className="text-[28px] leading-[1.15] font-[550] tracking-[-0.03em]">
            Tested before it shipped
          </h2>
          <p className="mt-2 text-[15px] leading-[1.6] text-ink-2">
            Every push runs the full suite in CI. The parity tests prove the offer the app signs is the exact offer the
            contract accepts.
          </p>
          <Table
            rows={[
              ["Contract unit, guard and parity tests", "102"],
              ["Fuzz tests, 1,000 runs each", "20"],
              ["Invariant tests, 256 runs × 64 calls", "7"],
              ["Mainnet fork tests on live USDC", "2"],
              ["Underwriter tests", "1,202"],
              ["Envio indexer tests", "3"],
            ]}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill href={`${links.repo}/actions`}>CI runs</Pill>
            <Pill href={`${links.repo}/tree/main/contracts/test`}>Contract tests</Pill>
            <Pill href={`${links.repo}/tree/main/underwriter/test`}>Underwriter tests</Pill>
            <Pill href={`${links.repo}/blob/main/indexer/src/indexer.test.ts`}>Indexer tests</Pill>
          </div>
        </div>
        <div>
          <h2 className="text-[28px] leading-[1.15] font-[550] tracking-[-0.03em]">Measured cost</h2>
          <p className="mt-2 text-[15px] leading-[1.6] text-ink-2">
            Gas used on a fork of Monad mainnet with live USDC. A sale that also repays an advance stays cheap enough for
            small tickets.
          </p>
          <Table
            rows={[
              ["Payment, no advance open", "67,096 gas"],
              ["Payment that also repays", "119,601 gas"],
              ["Draw an advance", "153,643 gas"],
              ["Lender deposit", "74,005 gas"],
            ]}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill href={`${links.repo}/blob/main/contracts/test/fork/MainnetFork.t.sol`}>Fork test</Pill>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

type Advance = { merchant: string; amount: string; txHash: string; repaid: boolean; repaidTx: string | null };
type Stats = { payments: number; volume: string; merchants: number; advances: number; repaid: number };

function Activity() {
  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: async () => (await (await fetch("/api/stats")).json()) as Stats,
  });
  const adv = useQuery({
    queryKey: ["advances"],
    queryFn: async () => (await (await fetch("/api/advances", { cache: "no-store" })).json()) as { advances: Advance[] },
  });
  const list = adv.data?.advances?.slice(0, 6) ?? [];

  return (
    <Reveal as="section" aria-labelledby="activity-title">
      <h2 id="activity-title" className="text-[28px] leading-[1.15] font-[550] tracking-[-0.03em]">
        Activity onchain
      </h2>
      <p className="mt-2 text-[15px] text-ink-2">Counted from the contracts&apos; own events since deployment.</p>
      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-hairline bg-hairline md:grid-cols-4">
        {[
          ["Sales paid", stats.data?.payments.toLocaleString("en-US")],
          ["Sales volume", stats.data && `${usdc(BigInt(stats.data.volume))} USDC`],
          ["Merchants paid", stats.data?.merchants.toLocaleString("en-US")],
          ["Advances repaid", stats.data && `${stats.data.repaid} of ${stats.data.advances}`],
        ].map(([k, v]) => (
          <div key={k} className="bg-white p-5">
            <dt className="text-[13px] text-ink-2">{k}</dt>
            <dd className="mt-2 font-mono text-[22px] tracking-[-0.02em]">{v ?? "..."}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 rounded-[20px] border border-hairline bg-white">
        {adv.isLoading ? (
          <p className="p-6 text-[15px] text-ink-2">Reading from Monad...</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-[15px] text-ink-2">
            No advances drawn yet. The first one will show here with its transaction, and again when it&apos;s repaid.
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            {list.map((a) => (
              <li key={a.txHash} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <Link href={`/m/${a.merchant}`} className="font-mono text-[14px] hover:underline">
                  {short(a.merchant)}
                </Link>
                <span className="flex items-center gap-4 text-[14px]">
                  <a href={txUrl(a.txHash)} target="_blank" rel="noreferrer" className="font-mono hover:underline">
                    {usdc(BigInt(a.amount))} USDC
                  </a>
                  {a.repaid && a.repaidTx ? (
                    <a href={txUrl(a.repaidTx)} target="_blank" rel="noreferrer" className="text-positive hover:underline">
                      Repaid
                    </a>
                  ) : (
                    <span className="text-primary-ink">Repaying</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Reveal>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "loading")
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-ink-3" aria-label="Checking">
        <Loader2 size={18} className="animate-spin" />
      </span>
    );
  return status === "pass" ? (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[rgba(21,128,61,0.1)] text-positive" aria-label="Passing">
      <Check size={18} strokeWidth={2.25} />
    </span>
  ) : (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[rgba(194,65,12,0.1)] text-error" aria-label="Failing">
      <X size={18} strokeWidth={2.25} />
    </span>
  );
}

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="mt-6 divide-y divide-hairline overflow-hidden rounded-[20px] border border-hairline bg-white">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-4 px-5 py-4">
          <dt className="text-[15px] text-ink-2">{k}</dt>
          <dd className="font-mono text-[15px]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Pill({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary-tint px-4 text-[14px] text-primary-ink transition-colors hover:bg-[rgba(110,84,255,0.16)]"
    >
      {children}
      <ExternalLink size={13} aria-hidden="true" />
    </a>
  );
}

