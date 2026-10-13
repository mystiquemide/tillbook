import { isValidElement, type ReactNode } from "react";
import { groups } from "./content";

/** Plain text of a React tree, so search covers each page's body and not only its title. */
function text(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join(" ");
  if (isValidElement(node)) {
    const p = node.props as { children?: ReactNode; head?: string[]; rows?: ReactNode[][] };
    return [text(p.children), (p.head ?? []).join(" "), text(p.rows as ReactNode)].join(" ");
  }
  return "";
}

export const searchIndex = groups.flatMap((g) =>
  g.pages.map((p) => ({
    slug: p.slug,
    title: p.title,
    group: g.title,
    text: [p.description, ...p.sections.map((s) => `${s.title} ${text(s.body)}`)].join(" ").replace(/\s+/g, " ").slice(0, 4000),
  })),
);
