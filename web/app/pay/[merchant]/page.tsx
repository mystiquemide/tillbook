import type { Metadata } from "next";
import { getAddress, isAddress } from "viem";
import { SiteHeader } from "@/components/SiteHeader";
import { NotLive, Notice } from "@/components/app/Notice";
import { addresses, isLive } from "@/lib/chain";
import { Checkout } from "./Checkout";

export const metadata: Metadata = { title: "Pay | Tillbook" };

export default async function PayPage({ params }: { params: Promise<{ merchant: string }> }) {
  const { merchant } = await params;
  const valid =
    isAddress(merchant) &&
    getAddress(merchant) !== addresses.pool &&
    getAddress(merchant) !== addresses.router &&
    BigInt(merchant) !== 0n;

  return (
    <>
      <SiteHeader variant="checkout" />
      <main id="main" className="mx-auto max-w-[480px] px-4 py-12 md:py-16">
        {!isLive ? (
          <NotLive />
        ) : !valid ? (
          <>
            <h1 className="mb-3 text-[14px] font-[400] text-ink-2">Pay this merchant</h1>
            <Notice title="This isn't a valid payment link." tone="error">
              Ask the merchant to send their Tillbook link again.
            </Notice>
          </>
        ) : (
          <Checkout merchant={getAddress(merchant)} />
        )}
      </main>
    </>
  );
}
