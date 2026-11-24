import { Manrope, Unbounded, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/components/Store";
import Shell from "@/components/Shell";
import { INDEXING, SITE_NAME, SITE_URL } from "@/lib/site";
import { getSeo } from "@/lib/server/catalog";
import JsonLd from "@/lib/jsonld";
import { organization, website } from "@/lib/schema";
import { publicState } from "@/lib/server/shop";

const manrope = Manrope({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700"], variable: "--font-manrope", display: "swap" });
const unbounded = Unbounded({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "700"], variable: "--font-unbounded", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "cyrillic"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

// Заголовок, описание, ключевые слова и коды подтверждения задаются в админке → SEO.
// Переменные окружения GOOGLE_SITE_VERIFICATION и YANDEX_VERIFICATION работают как раньше.
export async function generateMetadata() {
  const seo = await getSeo();
  const google = seo.google || process.env.GOOGLE_SITE_VERIFICATION, yandex = seo.yandex || process.env.YANDEX_VERIFICATION;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: seo.title, template: "%s | lola.stl" },
    description: seo.description,
    applicationName: SITE_NAME,
    keywords: seo.keywords.split(",").map(k => k.trim()).filter(Boolean),
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    verification: { ...(google ? { google } : {}), ...(yandex ? { yandex } : {}) },
    openGraph: { type: "website", locale: "ru_RU", siteName: SITE_NAME, url: "/", ...(seo.ogImage ? { images: [seo.ogImage] } : {}) },
    twitter: { card: "summary_large_image" },
    robots: INDEXING ? { index: true, follow: true } : { index: false, follow: false },
    formatDetection: { telephone: false },
  };
}

export const viewport = { themeColor: "#090713", colorScheme: "dark", width: "device-width", initialScale: 1, viewportFit: "cover" };

// Каталог, цены и акция читаются из базы и передаются в браузер. Готовый HTML кешируется (ISR):
// каталог одинаковый для всех, корзина и покупки работают в браузере. Сохранение в админке сбрасывает кеш.
export const revalidate = 300;

// Совместимость с автопереводом браузера (Google Переводчик, Яндекс, Safari). Переводчик заменяет
// текст страницы своими тегами <font>, и когда React потом убирает или вставляет этот текст,
// браузер бросает NotFoundError — Next.js показывает «This page couldn’t load» на всём сайте.
// Здесь удаление и вставка рядом с уже подменённым узлом пропускаются вместо ошибки
// (известный обход: github.com/facebook/react/issues/11538). Без переводчика ничего не меняется.
const TRANSLATE_SAFE = `(function(){if(typeof Node!=="function"||!Node.prototype||Node.prototype.__lolaSafe)return;
var P=Node.prototype,rm=P.removeChild,ins=P.insertBefore;P.__lolaSafe=1;
P.removeChild=function(c){if(c&&c.parentNode!==this){if(c.parentNode)c.parentNode.removeChild(c);return c}return rm.apply(this,arguments)};
P.insertBefore=function(n,r){if(r&&r.parentNode!==this)return this.appendChild(n);return ins.apply(this,arguments)};})();`;

export default async function RootLayout({ children }) {
  const [initial, seo] = await Promise.all([publicState(), getSeo()]);
  return (
    <html lang="ru" className={`${manrope.variable} ${unbounded.variable} ${mono.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: TRANSLATE_SAFE }} /></head>
      <body>
        <JsonLd data={{ "@context": "https://schema.org", "@graph": [organization(seo), website(seo)] }} />
        <StoreProvider initial={initial}>
          <Shell demo={(process.env.DEMO || process.env.NEXT_PUBLIC_DEMO) !== "off"}>{children}</Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
