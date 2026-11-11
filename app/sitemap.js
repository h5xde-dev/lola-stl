import { getCategories, getModels } from "@/lib/server/catalog";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap() {
  const [list, cats] = await Promise.all([getModels(), getCategories()]);
  const latest = list.reduce((a, m) => (m.updated > a ? m.updated : a), "2026-01-01");
  const img = m => (m.photos || []).filter(p => p.startsWith("/")).map(p => SITE_URL + p);
  return [
    { url: SITE_URL + "/", lastModified: latest, changeFrequency: "weekly", priority: 1, images: list.flatMap(img).slice(0, 20) },
    ...cats.filter(c => list.some(m => m.category === c.id)).map(c => ({
      url: `${SITE_URL}/category/${c.slug}`, lastModified: latest, changeFrequency: "weekly", priority: .9,
      images: list.filter(m => m.category === c.id).flatMap(img),
    })),
    ...list.map(m => ({ url: `${SITE_URL}/models/${m.slug}`, lastModified: m.updated, changeFrequency: "monthly", priority: .8, images: img(m) })),
  ];
}
