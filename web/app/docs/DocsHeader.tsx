"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { links } from "@/lib/links";

type Entry = { slug: string; title: string; group: string; text: string };

/** Docs top bar: brand, search across every page, and the links people look for. */
export function DocsHeader({ index }: { index: Entry[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && document.activeElement?.tagName !== "INPUT")) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    const click = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", key);
    document.addEventListener("mousedown", click);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("mousedown", click);
    };
  }, []);

  const term = q.trim().toLowerCase();
  const results = term
    ? index.filter((e) => e.title.toLowerCase().includes(term) || e.text.toLowerCase().includes(term)).slice(0, 8)
    : [];
  const go = (slug: string) => {
    setOpen(false);
    setQ("");
    router.push(slug ? `/docs/${slug}` : "/docs");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-4 md:px-6">
        <Link href="/docs" aria-label="Tillbook documentation" className="-m-2 flex shrink-0 items-center gap-2.5 p-2">
          <Logo />
          <span className="rounded-full bg-primary-tint px-2 py-0.5 text-[12px] font-[500] text-primary-ink">Docs</span>
        </Link>

        <div ref={box} className="relative ml-auto w-full max-w-[360px] md:ml-8">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <input
            ref={input}
            type="search"
            value={q}
            placeholder="Search docs"
            aria-label="Search docs"
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
              if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
              if (e.key === "Enter" && results[active]) go(results[active].slug);
              if (e.key === "Escape") setOpen(false);
            }}
            className="h-9 w-full rounded-full bg-surface pr-12 pl-9 text-[14px] ring-1 ring-hairline focus:ring-primary"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded bg-white px-1.5 font-mono text-[11px] text-ink-3 ring-1 ring-hairline sm:block">
            ⌘K
          </kbd>
          {open && term && (
            <ul role="listbox" className="absolute top-11 right-0 left-0 overflow-hidden rounded-[14px] bg-white p-1.5 shadow-[0_18px_40px_-16px_rgba(33,29,29,0.28)] ring-1 ring-hairline">
              {results.length === 0 ? (
                <li className="px-3 py-2.5 text-[14px] text-ink-3">No results for &ldquo;{q.trim()}&rdquo;</li>
              ) : (
                results.map((r, i) => (
                  <li key={r.slug} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(r.slug)}
                      className={`block w-full rounded-[10px] px-3 py-2 text-left ${i === active ? "bg-surface" : ""}`}
                    >
                      <span className="block text-[14px] text-ink">{r.title}</span>
                      <span className="block text-[12px] text-ink-3">{r.group}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <nav aria-label="Links" className="ml-auto hidden shrink-0 items-center gap-1 md:flex">
          <a href={links.repo} target="_blank" rel="noreferrer" className="rounded-full px-3 py-2 text-[14px] text-ink-2 hover:text-ink">
            GitHub
          </a>
          <a href={links.x} target="_blank" rel="noreferrer" aria-label="Tillbook on X" className="grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:text-ink">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <Link href="/merchant" className="ml-1 inline-flex h-9 items-center rounded-full bg-ink px-4 text-[14px] font-[450] text-white hover:bg-[#3a3436]">
            Open app
          </Link>
        </nav>
      </div>
    </header>
  );
}
