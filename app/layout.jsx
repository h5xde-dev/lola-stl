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

export default async function RootLayout({ children }) {
  const [initial, seo] = await Promise.all([publicState(), getSeo()]);
  return (
    <html lang="ru" className={`${manrope.variable} ${unbounded.variable} ${mono.variable}`}>
      <body>
        <JsonLd data={{ "@context": "https://schema.org", "@graph": [organization(seo), website(seo)] }} />
        <StoreProvider initial={initial}>
          <Shell demo={(process.env.DEMO || process.env.NEXT_PUBLIC_DEMO) !== "off"}>{children}</Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
