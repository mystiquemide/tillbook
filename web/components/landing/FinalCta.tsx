import { ButtonLink } from "../Button";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="px-3 md:px-6">
      <div className="mx-auto flex max-w-[1392px] flex-col items-center rounded-[32px] bg-surface px-6 py-16 text-center md:py-24">
        <h2 id="cta-title" className="max-w-[720px] text-[40px] leading-[1.08] font-[550] tracking-[-0.05em] text-balance md:text-[64px]">
          Start building your record today.
        </h2>
        <p className="mt-5 max-w-[520px] text-[17px] leading-[1.55] text-ink-2 md:text-[19px]">
          Share your payment link, take your first sale, and watch your offer grow.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/merchant">Open merchant app</ButtonLink>
          <ButtonLink href="/lend" variant="tint">
            Lend USDC
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
