import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { MerchantDashboard } from "./MerchantDashboard";

export const metadata: Metadata = { title: "Merchant | Tillbook" };

export default function MerchantPage() {
  return (
    <>
      <SiteHeader variant="app" />
      <main id="main" className="mx-auto max-w-[1200px] px-4 py-12 md:px-6">
        <MerchantDashboard />
      </main>
    </>
  );
}
