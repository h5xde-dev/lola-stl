import ModelView from "@/components/ModelView";
import ClientModel from "@/components/ClientModel";
import { notFound } from "next/navigation";
import JsonLd from "@/lib/jsonld";
import { catName, getModel } from "@/lib/models";
import { DEFAULT_PRICES, boxPrice, paidPrice } from "@/lib/pricing";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const kindWord = m => (m.cat === "box" ? "бокса" : "кашпо");

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const m = await getModel(slug);
  if (!m) return { title: "Модель", robots: { index: false, follow: false } };
  const title = `${m.name} — STL-модель ${kindWord(m)} для 3D-печати`;
  const description = `${m.desc} Размер ${m.dims}, ${m.print}. Файл STL ${m.mb} МБ сразу после оплаты, продажа отпечатков разрешена.`;
  return {
    title,
    description,
    alternates: { canonical: `/models/${m.slug}` },
    openGraph: { type: "website", title, description, url: `/models/${m.slug}` },
  };
}

export default async function ModelPage({ params, searchParams }) {
  const { slug } = await params;
  const m = await getModel(slug);
  // Модели, добавленные в админке прототипа, живут только в браузере: их показывает клиент.
  if (!m) { if ((await searchParams).local) return <ClientModel slug={slug} />; notFound(); }
  const url = `${SITE_URL}/models/${m.slug}`;
  const price = m.cat === "box" ? boxPrice(DEFAULT_PRICES, 1, false) : paidPrice(DEFAULT_PRICES, 1);
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Product", "@id": url + "#product", name: m.name, description: m.desc, sku: m.id, url,
            image: `${url}/opengraph-image`, category: `STL-модели / ${catName(m.cat)}`,
            brand: { "@type": "Brand", name: SITE_NAME },
            additionalProperty: [
              { "@type": "PropertyValue", name: "Формат", value: "STL" },
              { "@type": "PropertyValue", name: "Размер файла", value: `${m.mb} МБ` },
              { "@type": "PropertyValue", name: "Размер после печати", value: m.dims },
              { "@type": "PropertyValue", name: "Настройки печати", value: m.print },
            ],
            offers: { "@type": "Offer", url, price, priceCurrency: "RUB", availability: "https://schema.org/InStock", itemCondition: "https://schema.org/NewCondition" },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Каталог", item: SITE_URL + "/" },
              { "@type": "ListItem", position: 2, name: m.name, item: url },
            ],
          },
        ],
      }} />
      <ModelView initial={m} />
    </>
  );
}
