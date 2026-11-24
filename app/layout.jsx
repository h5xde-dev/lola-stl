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

// Совместимость с автопереводом браузера (Google Переводчик и др.). Переводчик заменяет текстовые узлы
// страницы своими тегами <font>. React об этом не знает и потом:
//  - удаляет старый текстовый узел — браузер бросает NotFoundError, Next.js показывает «This page couldn’t load»;
//  - меняет текст узла, которого уже нет на странице, — изменение не видно, а новый текст добавляется рядом
//    со старым переводом («700 ₽ 0 ₽ 500 ₽»).
// Здесь наблюдатель запоминает, каким тегом переводчик заменил каждый текстовый узел, и удаление,
// вставка и смена текста перенаправляются на этот тег. Переводчик затем переводит новый текст сам.
// Без переводчика замен нет, и всё работает как обычно.
const TRANSLATE_SAFE = `(function(){if(typeof Node!=="function"||!window.MutationObserver||Node.prototype.__lolaSafe)return;
var P=Node.prototype,rm=P.removeChild,ins=P.insertBefore,map=new WeakMap();P.__lolaSafe=1;
function sub(n){var f=map.get(n),i=0;while(f&&!f.parentNode&&map.has(f)&&i++<5)f=map.get(f);return f}
function isF(n){return n&&n.nodeType===1&&n.nodeName==="FONT"}
new MutationObserver(function(rs){for(var i=0;i<rs.length;i++){var r=rs[i];if(!r.removedNodes.length)continue;
for(var j=0;j<r.removedNodes.length;j++){var t=r.removedNodes[j];if(t.nodeType!==3||map.has(t))continue;var f=null;
for(var k=0;k<r.addedNodes.length;k++)if(isF(r.addedNodes[k])){f=r.addedNodes[k];break}
if(!f&&isF(r.previousSibling))f=r.previousSibling;if(!f&&isF(r.nextSibling))f=r.nextSibling;if(f)map.set(t,f)}}})
.observe(document.documentElement,{childList:true,subtree:true});
P.removeChild=function(c){if(c&&c.parentNode!==this){var f=sub(c);if(f&&f.parentNode)rm.call(f.parentNode,f);return c}return rm.apply(this,arguments)};
P.insertBefore=function(n,r){if(r&&r.parentNode!==this){var f=sub(r);return f&&f.parentNode===this?ins.call(this,n,f):this.appendChild(n)}return ins.apply(this,arguments)};
var d=Object.getOwnPropertyDescriptor(P,"nodeValue");if(d&&d.set){Object.defineProperty(P,"nodeValue",{configurable:true,enumerable:d.enumerable,get:d.get,
set:function(v){d.set.call(this,v);if(this.nodeType===3&&!this.parentNode){var f=sub(this);if(f&&f.parentNode)f.textContent=v}}})}})();`;

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
