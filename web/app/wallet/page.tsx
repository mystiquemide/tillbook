import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { BackHome } from "@/components/BackHome";
import { FirstRunTip } from "@/components/app/FirstRunTip";
import { WalletHome } from "./WalletHome";

export const metadata: Metadata = { title: "Wallet | Tillbook" };

export default function WalletPage() {
  return (
    <>
      <SiteHeader variant="app" />
      <main id="main" className="min-h-[calc(100dvh-65px)] bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-6 md:py-14">
          <BackHome className="mb-6" />
          <div className="mb-8 empty:hidden">
            <FirstRunTip />
          </div>
          <WalletHome />
        </div>
      </main>
    </>
  );
}
