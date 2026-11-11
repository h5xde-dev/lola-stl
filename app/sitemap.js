import { getModels } from "@/lib/models";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap() {
  const list = await getModels();
  const latest = list.reduce((a, m) => (m.updated > a ? m.updated : a), "2026-01-01");
  return [
    { url: SITE_URL + "/", lastModified: latest, changeFrequency: "weekly", priority: 1 },
    ...list.map(m => ({ url: `${SITE_URL}/models/${m.slug}`, lastModified: m.updated, changeFrequency: "monthly", priority: .8 })),
  ];
}
