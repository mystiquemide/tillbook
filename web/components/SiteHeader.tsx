"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { ButtonLink } from "./Button";
import { WalletButton } from "./app/WalletButton";

const sections = [
  { href: "/#merchants", label: "Merchants" },
  { href: "/#network", label: "Live stats" },
  { href: "/#lenders", label: "Lenders" },
  { href: "/#trust", label: "Trust" },
  { href: "/#faq", label: "FAQ" },
];

const tabs = [
  { href: "/merchant", label: "Merchant" },
  { href: "/lend", label: "Lend" },
];

/** One header for every page, so height, width and alignment never shift between routes. */
export function SiteHeader({ variant }: { variant: "landing" | "app" | "checkout" }) {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-4 md:gap-8">
          <Link href="/" aria-label="Tillbook home" className="-m-2 shrink-0 p-2">
            <Logo compact={variant === "app"} />
          </Link>
          {variant === "app" && (
            <nav aria-label="App" className="flex gap-1">
              {tabs.map((t) => {
                const active = path.startsWith(t.href);
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-3 py-2.5 text-[14px] transition-colors ${
                      active ? "bg-surface text-ink ring-1 ring-hairline" : "text-ink-2 hover:text-ink"
                    }`}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
        {variant === "landing" && (
          <nav aria-label="Sections" className="hidden items-center gap-8 md:flex">
            {sections.map((s) => (
              <Link key={s.href} href={s.href} className="py-3 text-[14px] text-ink-2 transition-colors hover:text-ink">
                {s.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="flex shrink-0 items-center">
          {variant === "landing" ? (
            <ButtonLink href="/merchant" variant="dark" size="sm" className="h-9 px-4">
              Open app
            </ButtonLink>
          ) : (
            <WalletButton />
          )}
        </div>
      </div>
    </header>
  );
}
