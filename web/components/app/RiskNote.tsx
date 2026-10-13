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
