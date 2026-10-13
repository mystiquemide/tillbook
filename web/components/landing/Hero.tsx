import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "../Button";
import { BrowserFrame } from "./BrowserFrame";

export function Hero() {
  return (
    <section id="merchants" aria-label="Tillbook for merchants" className="scroll-mt-20 px-3 pt-4 md:px-6">
      <div className="mx-auto max-w-[1392px] overflow-hidden rounded-[32px] bg-surface">
        <div className="mx-auto flex max-w-[880px] flex-col items-center px-6 pt-16 text-center md:pt-24">
          <p style={{ "--delay": "0ms" } as React.CSSProperties} className="rise mb-6 inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-[15px] text-ink ring-1 ring-hairline">
            <svg width="18" height="18" viewBox="0 0 22 22" aria-hidden="true">
              <rect x="1" y="1" width="20" height="20" rx="6" fill="var(--primary)" />
              <path d="M6 8h10M6 11.5h10M6 15h6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Tillbook for merchants
          </p>
          <h1 style={{ "--delay": "80ms" } as React.CSSProperties} className="rise text-[44px] leading-[1.08] font-[550] tracking-[-0.05em] text-balance md:text-[72px] md:leading-[1.1]">
            Your sales are your credit.
          </h1>
          <p style={{ "--delay": "160ms" } as React.CSSProperties} className="rise mt-6 max-w-[620px] text-[17px] leading-[1.55] text-ink-2 md:text-[19px]">
            Take payments in USDC on Monad. Every sale builds a record any lender can see. Draw an advance and repay it a
            little from each sale.
          </p>
          <div style={{ "--delay": "240ms" } as React.CSSProperties} className="rise mt-9 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/merchant">Open merchant app</ButtonLink>
            <ButtonLink href="/lend" variant="tint">
              Lend USDC
            </ButtonLink>
          </div>
          <Link
            href="/proof"
            style={{ "--delay": "300ms" } as React.CSSProperties}
            className="rise group mt-6 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[14px] text-ink-2 hover:text-ink"
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-positive" aria-hidden="true" />
              Live on Monad mainnet
            </span>
            <span aria-hidden="true">·</span>
            <span>Verified contracts</span>
            <span aria-hidden="true">·</span>
            <span>1,336 tests</span>
            <span aria-hidden="true">·</span>
            <span className="text-primary-ink group-hover:underline">Check it yourself</span>
          </Link>
        </div>

        <div className="relative mt-14 md:mt-20">
          <div className="absolute inset-x-0 top-[18%] bottom-0 bg-[#ebe7ff]" aria-hidden="true" />
          <div style={{ "--delay": "360ms" } as React.CSSProperties} className="rise relative mx-auto hidden max-w-[1040px] px-8 pb-16 md:block">
            <BrowserFrame src="/screens/merchant.jpg" alt="Tillbook merchant dashboard with a sales ledger and an advance offer" path="merchant" />
          </div>
          <div style={{ "--delay": "360ms" } as React.CSSProperties} className="rise relative mx-auto w-[260px] pb-10 md:hidden">
            <div className="float overflow-hidden rounded-[36px] bg-ink p-2.5">
              <Image
                src="/screens/merchant-mobile.jpg"
                alt="Tillbook merchant app on a phone, showing an advance being repaid from sales"
                width={1170}
                height={2280}
                sizes="240px"
                className="h-auto w-full rounded-[28px]"
              />
            </div>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-3 max-w-[1392px] px-4 text-center text-[12px] text-ink-3 md:text-right">
        Dashboard from a test run on a fork of Monad mainnet with live USDC.
      </p>
    </section>
  );
}
