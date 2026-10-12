import Link from "next/link";
import { Logo } from "./Logo";
import { ButtonLink } from "./Button";

const items = [
  { href: "/#how", label: "How it works" },
  { href: "/#merchants", label: "Merchants" },
  { href: "/#lenders", label: "Lenders" },
  { href: "/#faq", label: "FAQ" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-6">
        <Link href="/" aria-label="Tillbook home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className="text-[14px] text-ink-2 transition-colors hover:text-ink">
              {i.label}
            </Link>
          ))}
        </nav>
        <ButtonLink href="/merchant" variant="dark" size="sm">
          Open app
        </ButtonLink>
      </div>
    </header>
  );
}
