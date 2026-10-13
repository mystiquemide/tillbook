import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { LendDashboard } from "./LendDashboard";

export const metadata: Metadata = { title: "Lend | Tillbook" };

export default function LendPage() {
  return (
    <>
      <SiteHeader variant="app" />
      <main id="main" className="mx-auto max-w-[1200px] px-4 py-12 md:px-6">
        <LendDashboard />
      </main>
    </>
  );
}
