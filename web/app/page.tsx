import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/landing/Hero";
import { PoolStrip } from "@/components/landing/PoolStrip";
import { LenderBand } from "@/components/landing/LenderBand";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <PoolStrip />
        <LenderBand />
      </main>
      <Footer />
    </>
  );
}
