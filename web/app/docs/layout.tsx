import type { ReactNode } from "react";
import { groups } from "./content";
import { Sidebar } from "./Sidebar";
import { DocsHeader } from "./DocsHeader";
import { searchIndex } from "./search";

export default function DocsLayout({ children }: { children: ReactNode }) {
  const nav = groups.map((g) => ({ title: g.title, pages: g.pages.map((p) => ({ slug: p.slug, title: p.title })) }));
  return (
    <>
      <DocsHeader index={searchIndex} />
      <div className="mx-auto max-w-[1280px] px-4 md:px-6">
        <div className="gap-10 py-8 lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:py-12">
          <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto">
            <Sidebar nav={nav} />
          </aside>
          <div className="mt-8 min-w-0 lg:mt-0">{children}</div>
        </div>
      </div>
    </>
  );
}
