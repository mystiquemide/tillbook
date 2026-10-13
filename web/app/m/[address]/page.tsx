import type { Metadata } from "next";
import { getAddress, isAddress } from "viem";
import { SiteHeader } from "@/components/SiteHeader";
import { NotLive, Notice } from "@/components/app/Notice";
import { addresses, isLive } from "@/lib/chain";
import { short } from "@/lib/format";
import { MerchantRecord } from "./MerchantRecord";

type Props = { params: Promise<{ address: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  return { title: isAddress(address) ? `Merchant ${short(address)} | Tillbook` : "Merchant record | Tillbook" };
}

export default async function MerchantRecordPage({ params }: Props) {
  const { address } = await params;
  const valid =
    isAddress(address) &&
    getAddress(address) !== addresses.pool &&
    getAddress(address) !== addresses.router &&
    BigInt(address) !== 0n;

  return (
    <>
      <SiteHeader variant="app" />
      <main id="main" className="mx-auto max-w-[1200px] px-4 py-12 md:px-6">
        {!isLive ? (
          <NotLive />
        ) : !valid ? (
          <>
            <h1 className="mb-6 text-[40px] leading-[1.2] font-[500] tracking-[-0.03em]">Merchant record</h1>
            <Notice title="This isn't a valid merchant address." tone="error">
              Check the link. A merchant address is 42 characters and starts with 0x.
            </Notice>
          </>
        ) : (
          <MerchantRecord address={getAddress(address)} />
        )}
      </main>
    </>
  );
}
