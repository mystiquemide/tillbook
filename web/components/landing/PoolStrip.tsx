import { Lock } from "lucide-react";

const labels = ["In the lender pool", "Advanced to merchants", "Sales paid through Tillbook", "Advances repaid in full"];
const widths = ["w-[132px]", "w-[118px]", "w-[72px]", "w-[104px]"];

/** Network activity, shown as redacted figures. Pool and merchant amounts aren't published on the landing page. */
export function PoolStrip() {
  return (
    <section id="network" aria-labelledby="network-title" className="scroll-mt-20 px-3 pt-6 md:px-6">
      <div className="mx-auto max-w-[1392px] rounded-[32px] border border-hairline px-6 py-12 md:py-14">
        <h2 id="network-title" className="text-center text-[22px] font-[450] tracking-[-0.03em] md:text-[24px]">
          <span className="inline-flex items-center gap-2.5">
            <span className="live-dot h-2 w-2 rounded-full bg-positive" aria-hidden="true" />
            Live on Monad
          </span>
        </h2>
        <dl className="mx-auto mt-8 grid max-w-[960px] grid-cols-2 gap-y-8 md:grid-cols-4 md:divide-x md:divide-hairline">
          {labels.map((label, i) => (
            <div key={label} className="px-2 text-center md:px-6">
              <dd className="flex h-[40px] items-center justify-center">
                <span className="sr-only">Private</span>
                <span
                  aria-hidden="true"
                  className={`redacted inline-block h-[30px] rounded-[8px] md:h-[34px] ${widths[i]}`}
                  style={{ animationDelay: `${i * 180}ms` }}
                />
              </dd>
              <dt className="mt-2 text-[14px] text-ink-2">{label}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-8 inline-flex w-full items-center justify-center gap-1.5 text-center text-[13px] text-ink-3">
          <Lock size={13} aria-hidden="true" />
          Figures are kept private.
        </p>
      </div>
    </section>
  );
}
