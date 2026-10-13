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
      { label: "Getting started", href: "/start" },
      { label: "For merchants", href: "/merchant" },
      { label: "For lenders", href: "/lend" },
      { label: "Trust", href: "/trust" },
      { label: "Proof", href: "/proof" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Trust and support",
    items: [
      { label: "Risks and privacy", href: "/risks" },
      { label: "Report a vulnerability", href: `${links.repo}/security` },
      { label: "Support", href: `${links.repo}/issues` },
    ],
  },
  {
    title: "Build",
    items: [
      { label: "Source code", href: links.repo },
      { label: "Contracts", href: links.contracts },
      { label: "Monad", href: links.monad },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-6 border-t border-hairline">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-6 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-[320px] text-[14px] leading-[1.6] text-ink-2">
            Merchant credit on Monad. Your sales history is portable and yours.
          </p>
          <a
            href={links.x}
            target="_blank"
            rel="noreferrer"
            aria-label="Tillbook on X"
            className="inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[14px] text-ink ring-1 ring-hairline transition-colors hover:bg-surface"
          >
            <XLogo />
            @tillbook_xyz
          </a>
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
      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-6 py-6 text-[13px] text-ink-3 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Tillbook. All rights reserved.</p>
          <Link href="/proof" className="group inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 hover:text-ink">
            <span>Verified contracts</span>
            <span aria-hidden="true">·</span>
            <span>1,336 tests</span>
            <span aria-hidden="true">·</span>
            <span className="text-primary-ink group-hover:underline">Check it yourself</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}

function XLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
