import type { ReactNode } from "react";

/** A plain full-width message used for empty, pre-launch and error states. */
export function Notice({ title, children, tone = "neutral" }: { title: string; children?: ReactNode; tone?: "neutral" | "warning" | "error" }) {
  const color = tone === "error" ? "text-error" : tone === "warning" ? "text-warning" : "text-ink";
  return (
    <div className="rounded-[16px] border border-hairline bg-surface px-6 py-8">
      <p className={`text-[17px] font-[450] ${color}`}>{title}</p>
      {children && <div className="mt-2 max-w-[560px] text-[15px] leading-[1.6] text-ink-2">{children}</div>}
    </div>
  );
}

export function NotLive() {
  return (
    <Notice title="Tillbook isn't live on Monad yet.">
      The pool and payment contracts haven&apos;t been deployed. This page reads everything straight from the chain, so
      it stays empty until they are.
    </Notice>
  );
}
