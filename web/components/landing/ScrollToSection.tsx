"use client";

import { useEffect } from "react";
import { sectionBySlug } from "@/lib/sections";

function scrollTo(id: string | undefined, behavior: ScrollBehavior) {
  if (id) document.getElementById(id)?.scrollIntoView({ behavior });
  else window.scrollTo({ top: 0, behavior });
}

/** Opens a section URL like /faq at that section, and keeps back/forward in step with section links. */
export function ScrollToSection({ id }: { id?: string }) {
  useEffect(() => {
    if (id) scrollTo(id, "instant");
    // Section links share one page, so the browser's own scroll restoration would fight ours on back/forward.
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const onPop = () => scrollTo(sectionBySlug(window.location.pathname.slice(1))?.id, "smooth");
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.history.scrollRestoration = previous;
    };
  }, [id]);
  return null;
}
