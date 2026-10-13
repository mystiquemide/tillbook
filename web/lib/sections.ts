/** Landing page sections that have their own clean URL, e.g. /faq. */
export const sections = [
  { slug: "merchants", id: "merchants", label: "Merchants", title: "For merchants" },
  { slug: "lenders", id: "lenders", label: "Lenders", title: "For lenders" },
  { slug: "trust", id: "trust", label: "Trust", title: "Trust" },
  { slug: "faq", id: "faq", label: "FAQ", title: "Questions" },
] as const;

export type Section = (typeof sections)[number];

export const sectionBySlug = (slug: string) => sections.find((s) => s.slug === slug);
export const sectionById = (id: string) => sections.find((s) => s.id === id);
