"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <SiteHeader variant="app" />
      <main id="main" className="mx-auto flex max-w-[560px] flex-col items-center px-6 py-24 text-center">
        <h1 className="text-[40px] leading-[1.15] font-[500] tracking-[-0.03em]">Something broke on our side.</h1>
        <p className="mt-4 text-[16px] leading-[1.6] text-ink-2">
          Your funds are safe. Nothing moves without a transaction you confirm in your wallet. Try loading the page again.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-12 items-center rounded-full bg-primary px-6 text-[16px] text-white hover:bg-primary-ink"
          >
            Try again
          </button>
          <Link href="/" className="inline-flex h-12 items-center rounded-full bg-primary-tint px-6 text-[16px] text-primary-ink">
            Go home
          </Link>
        </div>
      </main>
    </>
  );
}
