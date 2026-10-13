import { Plus } from "lucide-react";

const faqs = [
  {
    q: "How is my offer worked out?",
    a: "Half of what you sold through Tillbook in the last 30 days, with no single customer counting for more than 20%. You need sales from at least 3 different customers. Each advance you repay raises the multiplier, up to 2x, and no advance can go above 5,000 USDC.",
  },
  {
    q: "What does an advance cost?",
    a: "A flat 6% fee, shown before you draw. There's no interest and no daily debit. 10% of each sale goes to repaying the advance until it's cleared, and the rest lands in your wallet. You pay normal Monad network fees on transactions.",
  },
  {
    q: "What happens if a merchant stops getting paid through Tillbook?",
    a: "Repayment stops with it, because it only comes from sales. There's no collateral and no collections. That merchant can't draw another advance until the open one is repaid, and the onchain record shows it to every lender.",
  },
  {
    q: "Can lenders lose money?",
    a: "Yes. If an advance is never repaid, the pool carries that loss. The per-advance cap of 5,000 USDC limits how much any single merchant can take, and offers depend on sales history from several different customers.",
  },
  {
    q: "When can I withdraw from the pool?",
    a: "Any time, up to the USDC that isn't lent out. Money in active advances comes back to the pool as merchants make sales, and becomes withdrawable then.",
  },
  {
    q: "What do I need to get started?",
    a: "A browser wallet such as MetaMask or Rabby, connected to Monad, with USDC. Customers paying you need the same.",
  },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[760px]">
        <h2 id="faq-title" className="text-center text-[40px] leading-[1.08] font-[550] tracking-[-0.05em] md:text-[56px]">
          Questions
        </h2>
        <div className="mt-12 border-t border-hairline">
          {faqs.map(({ q, a }) => (
            <details key={q} className="group border-b border-hairline">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[18px] font-[450] tracking-[-0.01em] [&::-webkit-details-marker]:hidden">
                {q}
                <Plus size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-2 transition-transform group-open:rotate-45" />
              </summary>
              <p className="pb-6 pr-10 text-[16px] leading-[1.6] text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
