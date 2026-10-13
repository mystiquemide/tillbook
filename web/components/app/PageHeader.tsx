"use client";

import type { ComponentType, ReactNode } from "react";
import { useBlockNumber } from "wagmi";

/** Top of every app page: label, title, one line of context, and a live link to the chain it reads from. */
export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  eyebrow: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="rise flex flex-wrap items-end justify-between gap-6">
      <div className="min-w-0 max-w-[680px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-8 items-center gap-2 rounded-full bg-white px-3 text-[13px] font-[450] text-primary-ink ring-1 ring-hairline">
            <Icon size={15} strokeWidth={2} />
            {eyebrow}
          </span>
          <LiveBlock />
        </div>
        <h1 className="mt-4 text-[38px] leading-[1.1] font-[550] tracking-[-0.04em] md:text-[48px]">{title}</h1>
        <div className="mt-3 text-[16px] leading-[1.6] text-ink-2">{description}</div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

function LiveBlock() {
  const { data: block } = useBlockNumber({ watch: true, query: { refetchInterval: 4_000 } });
  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-full bg-white px-3 text-[13px] text-ink-2 ring-1 ring-hairline">
      <span className="live-dot h-1.5 w-1.5 rounded-full bg-positive" aria-hidden="true" />
      Monad
      {block !== undefined && <span className="font-mono text-ink tabular-nums">#{block.toLocaleString("en-US")}</span>}
    </span>
  );
}
