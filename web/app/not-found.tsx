import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Page not found | Tillbook" };

export default function NotFound() {
  return (
    <>
      <SiteHeader variant="app" wallet={false} />
      <main id="main" className="mx-auto flex max-w-[560px] flex-col items-center px-6 py-24 text-center">
        <p className="font-mono text-[14px] text-ink-3">404</p>
        <h1 className="mt-3 text-[40px] leading-[1.15] font-[500] tracking-[-0.03em]">This page doesn&apos;t exist.</h1>
        <p className="mt-4 text-[16px] leading-[1.6] text-ink-2">Check the link, or head back to Tillbook.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex h-12 items-center rounded-full bg-primary px-6 text-[16px] text-white hover:bg-primary-ink">
            Go home
          </Link>
          <Link href="/merchant" className="inline-flex h-12 items-center rounded-full bg-primary-tint px-6 text-[16px] text-primary-ink">
            Open the app
          </Link>
        </div>
      </main>
    </>
  );
}
