import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { findPage, groups, pages } from "../content";

type Props = { params: Promise<{ slug?: string[] }> };

export function generateStaticParams() {
  return pages.map((p) => ({ slug: p.slug ? [p.slug] : [] }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = findPage((await params).slug?.[0] ?? "");
  if (!page) return {};
  return { title: `${page.title} | Tillbook Docs`, description: page.description };
}

const href = (slug: string) => (slug ? `/docs/${slug}` : "/docs");

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  if (slug && slug.length > 1) notFound();
  const page = findPage(slug?.[0] ?? "");
  if (!page) notFound();
  const i = pages.indexOf(page);
  const prev = pages[i - 1];
  const next = pages[i + 1];
  const group = groups.find((g) => g.pages.includes(page))!;

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_200px] xl:gap-10">
      <article id="main" className="min-w-0">
        <p className="text-[14px] text-primary-ink">{group.title}</p>
        <h1 className="mt-2 text-[34px] leading-[1.15] font-[550] tracking-[-0.03em] md:text-[42px]">{page.title}</h1>
        <p className="mt-3 text-[17px] leading-[1.6] text-ink-2">{page.description}</p>
        <div className="docs-prose mt-8">
          {page.sections.map((s) => (
            <section key={s.id} aria-labelledby={s.id} className="scroll-mt-24">
              <h2 id={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </h2>
              {s.body}
            </section>
          ))}
        </div>
        <nav aria-label="Pages" className="mt-14 grid gap-3 border-t border-hairline pt-8 sm:grid-cols-2">
          {prev ? (
            <Link href={href(prev.slug)} className="group rounded-[14px] p-4 ring-1 ring-hairline hover:bg-surface">
              <span className="flex items-center gap-1.5 text-[13px] text-ink-3">
                <ArrowLeft size={14} aria-hidden="true" /> Previous
              </span>
              <span className="mt-1 block text-[16px] font-[450]">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={href(next.slug)} className="group rounded-[14px] p-4 text-right ring-1 ring-hairline hover:bg-surface">
              <span className="flex items-center justify-end gap-1.5 text-[13px] text-ink-3">
                Next <ArrowRight size={14} aria-hidden="true" />
              </span>
              <span className="mt-1 block text-[16px] font-[450]">{next.title}</span>
            </Link>
          )}
        </nav>
      </article>
      <aside className="hidden xl:block">
        <div className="sticky top-24">
          <p className="mb-3 text-[12px] font-[500] tracking-[0.06em] text-ink-3 uppercase">On this page</p>
          <ul className="space-y-2 border-l border-hairline">
            {page.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l border-transparent pl-3 text-[13px] text-ink-2 hover:border-ink hover:text-ink">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
