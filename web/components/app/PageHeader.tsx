"use client";

import type { ReactNode } from "react";

/** Top of every app page: title, one line of context and optional actions. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="rise flex flex-wrap items-end justify-between gap-6">
      <div className="min-w-0 max-w-[680px]">
        <h1 className="text-[38px] leading-[1.1] font-[550] tracking-[-0.04em] md:text-[48px]">{title}</h1>
        <div className="mt-3 text-[16px] leading-[1.6] text-ink-2">{description}</div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
