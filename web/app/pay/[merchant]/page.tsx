import type { Metadata } from "next";
import Link from "next/link";
import { getAddress, isAddress } from "viem";
import { Logo } from "@/components/Logo";
import { WalletButton } from "@/components/app/WalletButton";
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
      <header className="border-b border-hairline">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 md:px-6">
          <Link href="/" aria-label="Tillbook home">
            <Logo />
          </Link>
          <WalletButton />
        </div>
      </header>
      <main className="mx-auto max-w-[480px] px-4 py-12 md:py-16">
        {!isLive ? (
          <NotLive />
        ) : !valid ? (
          <Notice title="This isn't a valid payment link." tone="error">
            Ask the merchant to send their Tillbook link again.
          </Notice>
        ) : (
          <Checkout merchant={getAddress(merchant)} />
        )}
      </main>
    </>
  );
}
