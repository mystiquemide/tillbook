import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { Hero } from "./Hero";
import { PoolStrip } from "./PoolStrip";
import { LenderBand } from "./LenderBand";
import { Trust } from "./Trust";
import { Faq } from "./Faq";
import { BuiltOn } from "./BuiltOn";
import { FinalCta } from "./FinalCta";
import { ScrollToSection } from "./ScrollToSection";

export function Landing({ section }: { section?: string }) {
  return (
    <>
      <SiteHeader variant="landing" />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <PoolStrip />
        <LenderBand />
        <Trust />
        <BuiltOn />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <ScrollToSection id={section} />
    </>
  );
}
