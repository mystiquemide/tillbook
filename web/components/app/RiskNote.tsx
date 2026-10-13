import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { card } from "./Notice";

/** Shown beside every deposit control, so no lender reaches the button without seeing the risks. */
export function RiskNote() {
  const points = [
    "You can lose money. Advances have no collateral. If a merchant stops selling through Tillbook, the pool absorbs the loss.",
    "Returns aren't fixed or annual. They come from the 6% advance fee as merchants repay, and show up as a rising share value.",
    "USDC that's lent out can't be withdrawn until merchants repay it.",
    "The contracts are tested and source-verified, but haven't had an independent audit yet.",
  ];
  return (
    <div className={`${card} p-6`}>
      <p className="flex items-center gap-2 text-[15px] font-[450]">
        <ShieldAlert size={17} className="text-warning" aria-hidden="true" />
        Before you deposit
      </p>
      <ul className="mt-3 space-y-2.5">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5 text-[14px] leading-[1.55] text-ink-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-3" aria-hidden="true" />
            {p}
          </li>
        ))}
      </ul>
      <Link href="/risks" className="mt-4 inline-block text-[14px] text-primary-ink hover:underline">
        Read the full risk disclosure
      </Link>
    </div>
  );
}

/** Four steps from deposit to return, for lenders who don't know how a share vault works. */
export function HowLending() {
  const steps = [
    "You deposit USDC into the pool.",
    "You receive pool shares for your slice of it.",
    "Merchants draw advances, capped at 5,000 USDC each.",
    "Each repayment adds its fee to the pool, so every share is worth more.",
  ];
  return (
    <div className={`${card} p-6`}>
      <p className="text-[15px] font-[450]">How lending works</p>
      <ol className="mt-3 space-y-2.5">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3 text-[14px] leading-[1.5] text-ink-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-tint font-mono text-[12px] text-primary-ink">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
