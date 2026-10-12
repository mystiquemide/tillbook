import type { Metadata } from "next";
import { AppNav } from "@/components/app/AppNav";
import { MerchantDashboard } from "./MerchantDashboard";

export const metadata: Metadata = { title: "Merchant | Tillbook" };

export default function MerchantPage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-[1200px] px-6 py-12">
        <MerchantDashboard />
      </main>
    </>
  );
}
