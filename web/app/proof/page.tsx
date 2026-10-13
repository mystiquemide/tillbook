import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { NotLive } from "@/components/app/Notice";
import { isLive } from "@/lib/chain";
import { ProofBoard } from "./ProofBoard";

export const metadata: Metadata = {
  title: "Proof | Tillbook",
  description: "Live checks against the Tillbook contracts on Monad mainnet, plus tests and measured gas.",
};

export default function ProofPage() {
  return (
    <>
      <SiteHeader variant="landing" />
      <main id="main" className="bg-surface">
        <section className="px-6 pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="mx-auto max-w-[760px] text-center">
            <p className="rise mx-auto inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-[15px] ring-1 ring-hairline">
              <span className="live-dot h-2 w-2 rounded-full bg-positive" aria-hidden="true" />
              Checked live on Monad
            </p>
            <h1
              style={{ "--delay": "80ms" } as React.CSSProperties}
              className="rise mt-6 text-[44px] leading-[1.08] font-[550] tracking-[-0.05em] text-balance md:text-[64px]"
            >
              Don&apos;t trust it. Check it.
            </h1>
            <p
              style={{ "--delay": "160ms" } as React.CSSProperties}
              className="rise mx-auto mt-5 max-w-[560px] text-[17px] leading-[1.55] text-ink-2 md:text-[19px]"
            >
              Every claim Tillbook makes, read straight from the contracts on Monad mainnet, with links to the code and the
              tests behind it.
            </p>
          </div>
        </section>
        <div className="mx-auto max-w-[1100px] px-4 pb-24 md:px-6">{isLive ? <ProofBoard /> : <NotLive />}</div>
      </main>
      <Footer />
    </>
  );
}
