import Image from "next/image";
import { ButtonLink } from "../Button";
import { photos } from "@/lib/images";

export function Hero() {
  return (
    <section className="px-3 pt-4 md:px-6">
      <div className="mx-auto max-w-[1392px] rounded-[32px] bg-surface px-6 pt-16 pb-6 md:pt-24 md:pb-8">
        <div className="mx-auto flex max-w-[880px] flex-col items-center text-center">
          <p className="mb-6 inline-flex h-8 items-center rounded-full bg-primary-tint px-4 text-[14px] text-primary-ink">
            Built on Monad
          </p>
          <h1 className="text-[44px] leading-[1.08] font-[550] tracking-[-0.05em] text-balance md:text-[72px] md:leading-[1.1]">
            Your sales are your credit.
          </h1>
          <p className="mt-6 max-w-[620px] text-[17px] leading-[1.55] text-ink-2 md:text-[19px]">
            Take payments in USDC. Every sale builds a record any lender can see. Draw an advance and repay it a
            little from each sale.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/merchant">Get paid with Tillbook</ButtonLink>
            <ButtonLink href="/lend" variant="tint">
              Lend USDC
            </ButtonLink>
          </div>
        </div>
        <div className="relative mx-auto mt-14 aspect-[4/3] w-full max-w-[1200px] overflow-hidden rounded-[24px] md:mt-20 md:aspect-[21/9]">
          <Image
            src={photos.hero.src}
            alt={photos.hero.alt}
            fill
            priority
            sizes="(max-width: 1240px) 100vw, 1200px"
            className="object-cover object-[50%_40%]"
          />
        </div>
      </div>
    </section>
  );
}
