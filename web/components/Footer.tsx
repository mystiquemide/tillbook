import Link from "next/link";
import { Logo } from "./Logo";
import { links } from "@/lib/links";
import { sectionBySlug } from "@/lib/sections";
import { SectionLink } from "./landing/SectionLink";
import type { ComponentProps } from "react";

function AnyLink({ href, ...props }: { href: string } & Omit<ComponentProps<typeof Link>, "href">) {
  const slug = href.slice(1);
  return sectionBySlug(slug) ? <SectionLink slug={slug} {...props} /> : <Link href={href} {...props} />;
}

const columns = [
  {
    title: "Product",
    items: [
      { label: "For merchants", href: "/merchant" },
      { label: "For lenders", href: "/lend" },
      { label: "Live stats", href: "/stats" },
      { label: "Trust", href: "/trust" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Build",
    items: [
      { label: "Source code", href: links.repo },
      { label: "Contracts", href: links.contracts },
      { label: "Monad", href: links.monad },
      { label: "Monad Metropolis", href: links.hackathon },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-6 border-t border-hairline">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-6 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-[320px] text-[14px] leading-[1.6] text-ink-2">
            Merchant credit on Monad. Your sales history is public, portable and yours.
          </p>
        </div>
        {columns.map((c) => (
          <div key={c.title}>
            <h2 className="mb-4 text-[14px] font-[450] text-ink">{c.title}</h2>
            <ul className="space-y-3">
              {c.items.map((i) => {
                const external = i.href.startsWith("http");
                return (
                  <li key={i.label}>
                    <AnyLink
                      href={i.href}
                      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                      className="text-[14px] text-ink-2 transition-colors hover:text-ink"
                    >
                      {i.label}
                    </AnyLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2 border-t border-hairline px-6 py-6 text-[12px] leading-[1.6] text-ink-3 md:flex-row md:justify-between">
        <p>Built for Monad Metropolis, 2026. MIT licensed.</p>
      </div>
    </footer>
  );
}
