import { notFound } from "next/navigation";
import CategoryView from "@/components/CategoryView";
import JsonLd from "@/lib/jsonld";
import { getCategory, getModels } from "@/lib/models";
import { DEFAULT_PRICES, boxPrice, paidPrice } from "@/lib/pricing";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// Страница категории собирается на сервере при каждом запросе.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const c = await getCategory(slug);
  if (!c) return { title: "Категория", robots: { index: false, follow: false } };
  const title = `${c.name} — STL-модели для 3D-печати`;
  return {
    title,
    description: c.desc,
    alternates: { canonical: `/category/${c.slug}` },
    openGraph: { type: "website", title, description: c.desc, url: `/category/${c.slug}` },
    twitter: { card: "summary_large_image", title, description: c.desc },
  };
}

export default async function CategoryPage({ params, searchParams }) {
  const { slug } = await params;
  const c = await getCategory(slug);
  // Категории, добавленные в админке прототипа, живут только в браузере.
  if (!c) { if ((await searchParams).local) return <CategoryView slug={slug} />; notFound(); }
  const list = (await getModels()).filter(m => m.category === c.id);
  const url = `${SITE_URL}/category/${c.slug}`;
  const from = c.pricing === "box" ? boxPrice(DEFAULT_PRICES, 1, false) : paidPrice(DEFAULT_PRICES, 1);
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage", "@id": url, url, name: `${c.name} — STL-модели`, description: c.desc, inLanguage: "ru",
            isPartOf: { "@id": SITE_URL + "/#site" },
            mainEntity: {
              "@type": "ItemList", numberOfItems: list.length,
              itemListElement: list.map((m, i) => ({
                "@type": "ListItem", position: i + 1,
                item: {
                  "@type": "Product", name: m.name, url: `${SITE_URL}/models/${m.slug}`, description: m.desc,
                  image: m.photos?.[0] ? SITE_URL + m.photos[0] : undefined, brand: { "@type": "Brand", name: SITE_NAME },
                  offers: { "@type": "Offer", price: from, priceCurrency: "RUB", availability: "https://schema.org/InStock" },
                },
              })),
            },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Каталог", item: SITE_URL + "/" },
              { "@type": "ListItem", position: 2, name: c.name, item: url },
            ],
          },
        ],
      }} />
      <CategoryView slug={c.slug} initial={c} />
    </>
  );
}
