import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/landing/Hero";
import { PoolStrip } from "@/components/landing/PoolStrip";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <PoolStrip />
      </main>
      <Footer />
    </>
  );
}
