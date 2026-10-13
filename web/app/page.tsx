import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/landing/Hero";
import { PoolStrip } from "@/components/landing/PoolStrip";
import { LenderBand } from "@/components/landing/LenderBand";
import { Trust } from "@/components/landing/Trust";

export default function Home() {
  return (
    <>
      <SiteHeader variant="landing" />
      <main id="main">
        <Hero />
        <PoolStrip />
        <LenderBand />
        <Trust />
      </main>
      <Footer />
    </>
  );
}
