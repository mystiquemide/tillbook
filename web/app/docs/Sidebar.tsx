"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

type Nav = { title: string; pages: { slug: string; title: string }[] }[];

export function Sidebar({ nav }: { nav: Nav }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const href = (slug: string) => (slug ? `/docs/${slug}` : "/docs");
  const current = nav.flatMap((g) => g.pages).find((p) => href(p.slug) === path);

  const list = (
    <nav aria-label="Documentation" className="space-y-7">
      {nav.map((g) => (
        <div key={g.title}>
          <p className="mb-2 px-3 text-[12px] font-[500] tracking-[0.06em] text-ink-3 uppercase">{g.title}</p>
          <ul className="space-y-0.5">
            {g.pages.map((p) => {
              const active = href(p.slug) === path;
              return (
                <li key={p.slug}>
                  <Link
                    href={href(p.slug)}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-[10px] px-3 py-2 text-[14px] transition-colors ${
                      active ? "bg-primary-tint font-[450] text-primary-ink" : "text-ink-2 hover:bg-surface hover:text-ink"
                    }`}
                  >
                    {p.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-[12px] bg-surface px-4 py-3 text-[15px] ring-1 ring-hairline"
        >
          <span>{current?.title ?? "Documentation"}</span>
          <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        {open && <div className="mt-3 rounded-[14px] bg-white p-3 ring-1 ring-hairline">{list}</div>}
      </div>
      <div className="hidden lg:block">{list}</div>
    </>
  );
}
