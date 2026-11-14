import Link from "next/link";
import JsonLd from "@/lib/jsonld";
import ProductCard from "@/components/ProductCard";
import { getModels } from "@/lib/server/catalog";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// Раздел бесплатных моделей: файл приходит на email после оформления заказа на 0 ₽.
export const revalidate = 300;
const TITLE = "Бесплатные STL-модели для 3D-печати";
const DESC = "Авторские STL-модели кашпо и лотков, которые можно скачать бесплатно: оформите заказ на 0 ₽, и ссылка на файлы придёт на email.";

export const metadata = {
  title: TITLE, description: DESC, alternates: { canonical: "/free" },
  openGraph: { type: "website", title: TITLE, description: DESC, url: "/free" },
};

export default async function FreePage() {
  const list = (await getModels()).filter(m => m.free);
  const url = SITE_URL + "/free";
  return (
    <div className="inner-page">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "CollectionPage", "@id": url, url, name: TITLE, description: DESC, inLanguage: "ru", isPartOf: { "@id": SITE_URL + "/#site" },
            mainEntity: { "@type": "ItemList", numberOfItems: list.length, itemListElement: list.map((m, i) => ({
              "@type": "ListItem", position: i + 1,
              item: { "@type": "Product", name: m.name, url: `${SITE_URL}/models/${m.slug}`, description: m.desc,
                image: m.photos?.[0]?.startsWith("/") ? SITE_URL + m.photos[0] : undefined, brand: { "@type": "Brand", name: SITE_NAME },
                offers: { "@type": "Offer", price: 0, priceCurrency: "RUB", availability: "https://schema.org/InStock" } },
            })) } },
          { "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: "Каталог", item: SITE_URL + "/" },
            { "@type": "ListItem", position: 2, name: "Бесплатные модели", item: url },
          ] },
        ],
      }} />
      <nav className="breadcrumbs" aria-label="Навигация"><Link href="/">Каталог</Link><span aria-hidden="true">/</span><span aria-current="page">Бесплатные модели</span></nav>
      <div className="page-title"><span className="eyebrow">Подарок от мастерской</span><h1>Бесплатные модели</h1>
        <p>Добавьте модель в корзину и оформите заказ на 0 ₽ — ссылка на файлы придёт на email и сохранится в личном кабинете. Отпечатки можно продавать.</p></div>
      <div className="product-grid">
        {list.length ? list.map(m => <ProductCard key={m.id} m={m} />)
          : <div className="empty-state">Бесплатные модели скоро появятся. А пока — <Link href="/#catalog">весь каталог</Link>.</div>}
      </div>
    </div>
  );
}
