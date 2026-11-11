import ModelView from "@/components/ModelView";
import ClientModel from "@/components/ClientModel";
import { notFound } from "next/navigation";
import JsonLd from "@/lib/jsonld";
import { catOf, getModel, kindGen, kindName } from "@/lib/models";
import { productLd } from "@/lib/schema";
import { DEFAULT_PRICES, boxPrice, paidPrice } from "@/lib/pricing";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const kindWord = kindGen;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const m = await getModel(slug);
  if (!m) return { title: "Модель", robots: { index: false, follow: false } };
  const title = `${m.name} — STL-модель ${kindWord(m)} для 3D-печати`;
  const extra = [m.dims && `Размер ${m.dims}`, m.print].filter(Boolean).join(", ");
  const description = `${m.desc} ${extra ? extra + ". " : ""}Файл STL ${m.mb} МБ сразу после оплаты, продажа отпечатков разрешена.`;
  const price = m.cat === "box" ? boxPrice(DEFAULT_PRICES, 1, false) : paidPrice(DEFAULT_PRICES, 1);
  return {
    title,
    description,
    alternates: { canonical: `/models/${m.slug}` },
    keywords: [kindName(m), "STL-модель", "3D-печать", ...(m.tags || [])],
    openGraph: { type: "website", title, description, url: `/models/${m.slug}` },
    twitter: { card: "summary_large_image", title, description },
    // Товарные open-graph-теги: их читают Яндекс, VK и Telegram при показе ссылки.
    other: {
      "product:price:amount": String(price),
      "product:price:currency": "RUB",
      "product:availability": "in stock",
      "product:brand": SITE_NAME,
      "product:category": kindName(m),
    },
  };
}

export default async function ModelPage({ params, searchParams }) {
  const { slug } = await params;
  const m = await getModel(slug);
  // Модели, добавленные в админке прототипа, живут только в браузере: их показывает клиент.
  if (!m) { if ((await searchParams).local) return <ClientModel slug={slug} />; notFound(); }
  const url = `${SITE_URL}/models/${m.slug}`;
  const price = m.cat === "box" ? boxPrice(DEFAULT_PRICES, 1, false) : paidPrice(DEFAULT_PRICES, 1);
  const cat = catOf(m);
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          productLd(m, { price, categoryName: cat?.name || kindName(m) }),
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
