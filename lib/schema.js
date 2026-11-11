// Общие куски разметки schema.org для сниппетов Google и Яндекса.
import { SITE_DESC, SITE_NAME, SITE_URL } from "./site";

export const ORG_ID = SITE_URL + "/#org";
export const SITE_ID = SITE_URL + "/#site";

export const organization = () => ({
  "@type": "Organization", "@id": ORG_ID, name: SITE_NAME, url: SITE_URL,
  logo: { "@type": "ImageObject", url: SITE_URL + "/logo.png", width: 512, height: 512 },
  description: SITE_DESC,
  sameAs: (process.env.SAME_AS || process.env.NEXT_PUBLIC_SAME_AS || "").split(",").map(s => s.trim()).filter(Boolean),
});

// SearchAction даёт поисковикам строку поиска по сайту прямо в выдаче.
export const website = () => ({
  "@type": "WebSite", "@id": SITE_ID, url: SITE_URL, name: SITE_NAME, description: SITE_DESC, inLanguage: "ru",
  publisher: { "@id": ORG_ID },
  potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/?q={search_term_string}` }, "query-input": "required name=search_term_string" },
});

// Цена действительна до конца следующего года: так требует разметка товара.
export const priceValidUntil = () => `${new Date().getFullYear() + 1}-12-31`;

export const productLd = (m, { price, categoryName }) => {
  const url = `${SITE_URL}/models/${m.slug}`;
  const images = [...(m.photos || []).filter(p => p.startsWith("/")).map(p => SITE_URL + p), `${url}/opengraph-image`];
  return {
    "@type": "Product", "@id": url + "#product", name: m.name, description: m.desc, sku: m.id, mpn: m.slug, url,
    image: images, category: `STL-модели / ${categoryName}`,
    brand: { "@type": "Brand", name: SITE_NAME },
    keywords: [categoryName, "STL", "3D-печать", ...(m.tags || [])].join(", "),
    ...(m.material ? { material: m.material } : {}),
    additionalProperty: [
      { "@type": "PropertyValue", name: "Формат", value: "STL" },
      { "@type": "PropertyValue", name: "Размер файла", value: `${m.mb} МБ` },
      m.dims && { "@type": "PropertyValue", name: "Размер после печати", value: m.dims },
      m.print && { "@type": "PropertyValue", name: "Настройки печати", value: m.print },
      { "@type": "PropertyValue", name: "Лицензия", value: "личное использование и продажа отпечатков" },
    ].filter(Boolean),
    offers: {
      "@type": "Offer", url, price, priceCurrency: "RUB", priceValidUntil: priceValidUntil(),
      availability: "https://schema.org/InStock", itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": ORG_ID },
    },
  };
};
