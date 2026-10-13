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
      {section && (
        // Runs while the HTML is still parsing, so a shared link like /faq lands on its section before the app loads.
        <script
          dangerouslySetInnerHTML={{
            // Fonts and images can still move the section after the first scroll, so repeat once they settle,
            // unless the visitor has started scrolling themselves.
            __html: `(function(){history.scrollRestoration="manual";var moved=0,at=location.pathname,go=function(){var e=document.getElementById(${JSON.stringify(section)});if(e&&!moved&&location.pathname===at)e.scrollIntoView({behavior:"instant"})};["wheel","touchstart","keydown","pointerdown"].forEach(function(t){addEventListener(t,function(){moved=1},{once:true,passive:true})});go();document.fonts&&document.fonts.ready.then(go);addEventListener("load",go);document.addEventListener("load",go,true);setTimeout(function(){moved=1},4000)})();`,
          }}
        />
      )}
      <ScrollToSection id={section} />
    </>
  );
}
