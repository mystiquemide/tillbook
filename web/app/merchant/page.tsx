import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { BackHome } from "@/components/BackHome";
import { FirstRunTip } from "@/components/app/FirstRunTip";
import { MerchantDashboard } from "./MerchantDashboard";

export const metadata: Metadata = { title: "Merchant | Tillbook" };

export default function MerchantPage() {
  return (
    <>
      <SiteHeader variant="app" />
      <main id="main" className="min-h-[calc(100dvh-65px)] bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-6 md:py-14">
          <BackHome className="mb-6" />
        <div className="mb-8 empty:hidden">
          <FirstRunTip />
        </div>
        <MerchantDashboard />
        </div>
      </main>
    </>
  );
}
