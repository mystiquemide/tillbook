import type { MetadataRoute } from "next";
import { pages } from "./docs/content";

const base = "https://tillbook.midelabs.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  const app = ["", "/start", "/merchant", "/lend", "/wallet", "/proof", "/risks", "/faq"];
  const docs = pages.map((p) => (p.slug ? `/docs/${p.slug}` : "/docs"));
  return [...app, ...docs].map((path) => ({ url: `${base}${path}`, changeFrequency: "weekly", priority: path === "" ? 1 : 0.7 }));
}
