import ModelView from "@/components/ModelView";
import ClientModel from "@/components/ClientModel";
import { notFound } from "next/navigation";
import JsonLd from "@/lib/jsonld";
import { catOf, kindGen, kindName } from "@/lib/models";
import { getCategories, getModel } from "@/lib/server/catalog";
import { getPrices } from "@/lib/server/catalog";
import { productLd } from "@/lib/schema";
import { boxPrice, paidPrice } from "@/lib/pricing";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";


export async function generateMetadata({ params }) {
  const { slug } = await params;
  const m = await getModel(slug);
  if (!m) return { title: "Модель", robots: { index: false, follow: false } };
  const cats = await getCategories();
  const title = `${m.name} — STL-модель ${kindGen(m, cats)} для 3D-печати`;
  const extra = [m.dims && `Размер ${m.dims}`, m.print].filter(Boolean).join(", ");
  const description = `${m.desc} ${extra ? extra + ". " : ""}Файл STL ${m.mb} МБ сразу после оплаты, продажа отпечатков разрешена.`;
  const prices = await getPrices();
  const price = m.cat === "box" ? boxPrice(prices, 1, false) : paidPrice(prices, 1);
  return {
    title,
    description,
    alternates: { canonical: `/models/${m.slug}` },
    keywords: [kindName(m, cats), "STL-модель", "3D-печать", ...(m.tags || [])],
    openGraph: { type: "website", title, description, url: `/models/${m.slug}` },
    twitter: { card: "summary_large_image", title, description },
    // Товарные open-graph-теги: их читают Яндекс, VK и Telegram при показе ссылки.
    other: {
      "product:price:amount": String(price),
      "product:price:currency": "RUB",
      "product:availability": "in stock",
      "product:brand": SITE_NAME,
      "product:category": kindName(m, cats),
    },
  };
}

export default async function ModelPage({ params, searchParams }) {
  const { slug } = await params;
  const m = await getModel(slug);
  // Модели, добавленные в админке прототипа, живут только в браузере: их показывает клиент.
  if (!m) { if ((await searchParams).local) return <ClientModel slug={slug} />; notFound(); }
  const url = `${SITE_URL}/models/${m.slug}`;
  const prices = await getPrices();
  const price = m.cat === "box" ? boxPrice(prices, 1, false) : paidPrice(prices, 1);
  const cats = await getCategories();
  const cat = catOf(m, cats);
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          productLd(m, { price, categoryName: cat?.name || kindName(m, cats) }),
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Каталог", item: SITE_URL + "/" },
              ...(cat ? [{ "@type": "ListItem", position: 2, name: cat.name, item: `${SITE_URL}/category/${cat.slug}` }] : []),
              { "@type": "ListItem", position: cat ? 3 : 2, name: m.name, item: url },
            ],
          },
        ],
      }} />
      <ModelView initial={m} />
    </>
  );
}
