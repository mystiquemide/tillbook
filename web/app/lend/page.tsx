import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { FirstRunTip } from "@/components/app/FirstRunTip";
import { LendDashboard } from "./LendDashboard";

export const metadata: Metadata = { title: "Lend | Tillbook" };

export default function LendPage() {
  return (
    <>
      <SiteHeader variant="app" />
      <main id="main" className="min-h-[calc(100dvh-65px)] bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-6 md:py-14">
        <div className="mb-8 empty:hidden">
          <FirstRunTip />
        </div>
        <LendDashboard />
        </div>
      </main>
    </>
  );
}
