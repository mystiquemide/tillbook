import type { Metadata } from "next";
import { AppNav } from "@/components/app/AppNav";
import { LendDashboard } from "./LendDashboard";

export const metadata: Metadata = { title: "Lend | Tillbook" };

export default function LendPage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-[1200px] px-4 py-12 md:px-6">
        <LendDashboard />
      </main>
    </>
  );
}
