import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { Onboarding } from "./Onboarding";

export const metadata: Metadata = {
  title: "How Tillbook works | Tillbook",
  description: "A two-minute, hands-on walkthrough of Tillbook for shop owners, customers and lenders. No crypto knowledge needed.",
};

export default function StartPage() {
  return (
    <>
      <SiteHeader variant="app" />
      <main id="main" className="min-h-[calc(100dvh-65px)] bg-surface">
        <div className="mx-auto max-w-[960px] px-4 py-10 md:px-6 md:py-14">
          <Onboarding />
        </div>
      </main>
    </>
  );
}
