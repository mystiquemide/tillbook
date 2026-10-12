"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "../Logo";
import { WalletButton } from "./WalletButton";

const tabs = [
  { href: "/merchant", label: "Merchant" },
  { href: "/lend", label: "Lend" },
];

export function AppNav() {
  const path = usePathname();
  return (
    <header className="border-b border-hairline bg-white">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/" aria-label="Tillbook home">
            <Logo compact />
          </Link>
          <nav aria-label="App" className="flex gap-1">
            {tabs.map((t) => {
              const active = path.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3 py-1.5 text-[14px] transition-colors ${
                    active ? "bg-surface text-ink ring-1 ring-hairline" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <WalletButton />
      </div>
    </header>
  );
}
