import type { Metadata } from "next";
import { getAddress, isAddress } from "viem";
import { SiteHeader } from "@/components/SiteHeader";
import { NotLive, Notice } from "@/components/app/Notice";
import { addresses, isLive } from "@/lib/chain";
import { Checkout } from "./Checkout";
import { parseUsdc } from "@/lib/format";

export const metadata: Metadata = { title: "Pay | Tillbook" };

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ merchant: string }>;
  searchParams: Promise<{ amount?: string | string[] }>;
}) {
  const { merchant } = await params;
  // A payment request link can carry the amount, e.g. /pay/0x...?amount=25.50. Ignore anything that isn't a valid amount.
  const raw = (await searchParams).amount;
  const requested = typeof raw === "string" && parseUsdc(raw) !== null ? raw.trim() : "";
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
          <Checkout merchant={getAddress(merchant)} requested={requested} />
        )}
      </main>
    </>
  );
}
