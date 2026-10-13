import { AlertTriangle, CircleSlash, Info } from "lucide-react";
import type { ReactNode } from "react";

/** Shared surface for every app panel: white, hairline, soft lift off the warm page background. */
export const card =
  "rounded-[20px] border border-hairline bg-white shadow-[0_1px_2px_rgba(33,29,29,0.04),0_16px_40px_-28px_rgba(33,29,29,0.22)]";

/** A full-width message used for empty, pre-launch and error states. */
export function Notice({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children?: ReactNode;
  tone?: "neutral" | "warning" | "error";
}) {
  const Icon = tone === "error" ? CircleSlash : tone === "warning" ? AlertTriangle : Info;
  const tint =
    tone === "error"
      ? "bg-[rgba(194,65,12,0.1)] text-error"
      : tone === "warning"
        ? "bg-[rgba(180,88,11,0.1)] text-warning"
        : "bg-primary-tint text-primary-ink";
  return (
    <div className={`${card} flex gap-4 px-6 py-6`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${tint}`} aria-hidden="true">
        <Icon size={19} strokeWidth={1.9} />
      </span>
      <div className="min-w-0 pt-1.5">
        <p className={`text-[17px] font-[450] ${tone === "neutral" ? "text-ink" : tone === "error" ? "text-error" : "text-warning"}`}>
          {title}
        </p>
        {children && <div className="mt-1.5 max-w-[560px] text-[15px] leading-[1.6] text-ink-2">{children}</div>}
      </div>
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
