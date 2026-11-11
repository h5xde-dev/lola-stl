import { INDEXING, SITE_URL } from "@/lib/site";

export default function robots() {
  if (!INDEXING) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/cart", "/checkout", "/purchases"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
