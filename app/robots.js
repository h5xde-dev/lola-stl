import { INDEXING, SITE_URL } from "@/lib/site";

// Читается при каждом запросе: индексацию включают переменной INDEXING без пересборки.
export const dynamic = "force-dynamic";

export default function robots() {
  if (!INDEXING) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/cart", "/checkout", "/purchases"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
