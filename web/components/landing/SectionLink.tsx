"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { sectionBySlug, sections } from "@/lib/sections";

const onLanding = (path: string) => path === "/" || sections.some((s) => path === `/${s.slug}`);

/** Links to /<slug>. On the landing page it scrolls to the section and updates the URL without a reload. */
export function SectionLink({ slug, ...props }: { slug: string } & Omit<ComponentProps<typeof Link>, "href">) {
  const path = usePathname();
  const section = sectionBySlug(slug)!;
  return (
    <Link
      {...props}
      href={`/${slug}`}
      onClick={(e) => {
        props.onClick?.(e);
        if (!onLanding(path) || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        const el = document.getElementById(section.id);
        if (!el) return;
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", `/${slug}`);
      }}
    />
  );
}
