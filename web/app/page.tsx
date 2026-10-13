import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/landing/Hero";
import { PoolStrip } from "@/components/landing/PoolStrip";
import { LenderBand } from "@/components/landing/LenderBand";
import { Trust } from "@/components/landing/Trust";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <PoolStrip />
        <LenderBand />
        <Trust />
      </main>
      <Footer />
    </>
  );
}
