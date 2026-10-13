"use client";

import { ArrowRight, Eye, Lock, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useConnect } from "wagmi";
import { monad } from "@/lib/chain";
import { card } from "./Notice";

/** Shown before a wallet is connected. Explains what connecting does, and what it can't do. */
export function ConnectPrompt({
  title,
  body,
  points,
  compact = false,
}: {
  title: string;
  body: string;
  points?: string[];
  compact?: boolean;
}) {
  const { connect, connectors, isPending, error } = useConnect();
  const [hasProvider, setHasProvider] = useState(true);
  useEffect(() => setHasProvider("ethereum" in window), []);

  const button = hasProvider ? (
    <button
      type="button"
      onClick={() => connect({ connector: connectors[0]!, chainId: monad.id })}
      disabled={isPending}
      className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-[16px] font-[450] text-white transition-colors hover:bg-primary-ink disabled:opacity-60"
    >
      {isPending ? "Connecting..." : "Connect wallet"}
      {!isPending && <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}
    </button>
  ) : (
    <a
      href="https://metamask.io/download/"
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-[16px] font-[450] text-white hover:bg-primary-ink"
    >
      Install a wallet
    </a>
  );

  if (compact)
    return (
      <div className={`${card} p-6`}>
        <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-primary-tint text-primary-ink" aria-hidden="true">
          <Wallet size={21} strokeWidth={1.8} />
        </span>
        <p className="mt-5 text-[18px] font-[450]">{title}</p>
        <p className="mt-1.5 text-[15px] leading-[1.6] text-ink-2">{body}</p>
        <div className="mt-5 grid">{button}</div>
        {error && <p role="alert" className="mt-3 text-[13px] text-error">Wallet didn&apos;t connect. Try again.</p>}
      </div>
    );

  return (
    <div className={`${card} relative overflow-hidden`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary-tint blur-3xl"
      />
      <div className="relative grid gap-10 p-8 md:grid-cols-[1.1fr_1fr] md:p-12">
        <div>
          <span className="grid h-14 w-14 place-items-center rounded-[16px] bg-primary text-white" aria-hidden="true">
            <Wallet size={26} strokeWidth={1.8} />
          </span>
          <h2 className="mt-7 text-[30px] leading-[1.15] font-[550] tracking-[-0.03em] text-balance md:text-[36px]">{title}</h2>
          <p className="mt-3 max-w-[460px] text-[16px] leading-[1.6] text-ink-2">{body}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {button}
            <span className="text-[14px] text-ink-3">MetaMask, Rabby or any browser wallet</span>
          </div>
          {error && <p role="alert" className="mt-4 text-[14px] text-error">Wallet didn&apos;t connect. Try again.</p>}
        </div>
        <ul className="space-y-3 self-center">
          {(points ?? []).map((p) => (
            <li key={p} className="flex items-start gap-3 rounded-[14px] bg-surface p-4 ring-1 ring-hairline">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-primary-ink ring-1 ring-hairline" aria-hidden="true">
                <Eye size={14} strokeWidth={2} />
              </span>
              <span className="text-[15px] leading-[1.5]">{p}</span>
            </li>
          ))}
          <li className="flex items-start gap-3 rounded-[14px] bg-surface p-4 ring-1 ring-hairline">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-positive ring-1 ring-hairline" aria-hidden="true">
              <Lock size={14} strokeWidth={2} />
            </span>
            <span className="text-[15px] leading-[1.5]">
              Connecting only reads your address. Nothing moves until you confirm a transaction in your wallet.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
