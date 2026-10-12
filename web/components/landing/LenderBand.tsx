import Image from "next/image";
import { ButtonLink } from "../Button";
import { BrowserFrame } from "./BrowserFrame";
import { links } from "@/lib/links";

export function LenderBand() {
  return (
    <section id="lenders" aria-labelledby="lenders-title" className="scroll-mt-20 px-3 pt-6 md:px-6">
      <div className="mx-auto max-w-[1392px] overflow-hidden rounded-[32px] bg-dark-band text-white">
        <div className="mx-auto flex max-w-[880px] flex-col items-center px-6 pt-16 text-center md:pt-24">
          <p className="mb-6 inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-4 text-[15px] text-white">
            <svg width="18" height="18" viewBox="0 0 22 22" aria-hidden="true">
              <rect x="1" y="1" width="20" height="20" rx="6" fill="#fff" />
              <path d="M6 8h10M6 11.5h10M6 15h6" stroke="var(--dark-band)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Tillbook for lenders
          </p>
          <h2
            id="lenders-title"
            className="text-[40px] leading-[1.08] font-[550] tracking-[-0.05em] text-balance md:text-[72px] md:leading-[1.1]"
          >
            Lend against <span className="text-[#a89aff]">real sales.</span>
          </h2>
          <p className="mt-6 max-w-[620px] text-[17px] leading-[1.55] text-white/70 md:text-[19px]">
            Deposit USDC. Merchants repay from every sale, and the fee on each advance comes back to the pool as they
            do. Withdraw anything that isn&apos;t lent out, any time.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/lend" variant="light">
              Start lending
            </ButtonLink>
            <ButtonLink href={links.contracts} target="_blank" rel="noreferrer" variant="glass">
              Read the contracts
            </ButtonLink>
          </div>
        </div>
        <div className="mx-auto mt-14 hidden max-w-[1040px] px-8 pb-16 md:mt-20 md:block">
          <BrowserFrame src="/screens/lend.jpg" alt="Tillbook lend screen with live pool totals, advances and a deposit form" path="lend" dark />
        </div>
        <div className="mx-auto mt-12 w-[260px] pb-12 md:hidden">
          <div className="overflow-hidden rounded-[36px] bg-black p-2.5 ring-1 ring-white/10">
            <Image
              src="/screens/lend-mobile.jpg"
              alt="Tillbook lend screen on a phone with live pool totals"
              width={1170}
              height={2280}
              sizes="240px"
              className="h-auto w-full rounded-[28px]"
            />
          </div>
        </div>
      </div>
      <p className="mx-auto mt-3 max-w-[1392px] px-4 text-center text-[12px] text-ink-3 md:text-right">
        Lend screen from the same test run on a fork of Monad mainnet with live USDC.
      </p>
    </section>
  );
}
