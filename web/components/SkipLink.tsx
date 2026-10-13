"use client";

/** Moves keyboard focus to the main content without adding #main to the URL. */
export function SkipLink() {
  return (
    <a
      href="#main"
      onClick={(e) => {
        const main = document.getElementById("main");
        if (!main) return;
        e.preventDefault();
        if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
        main.focus();
        main.scrollIntoView();
      }}
      className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-[14px] text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Skip to content
    </a>
  );
}
