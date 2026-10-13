import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Landing } from "@/components/landing/Landing";
import { sectionBySlug, sections } from "@/lib/sections";

type Props = { params: Promise<{ section: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return sections.map((s) => ({ section: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = sectionBySlug((await params).section);
  return s ? { title: `${s.title} | Tillbook`, alternates: { canonical: "/" } } : {};
}

export default async function SectionPage({ params }: Props) {
  const s = sectionBySlug((await params).section);
  if (!s) notFound();
  return <Landing section={s.id} />;
}
