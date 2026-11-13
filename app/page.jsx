import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Download, Gift, MailCheck } from "lucide-react";
import Catalog from "@/components/Catalog";
import Hero3D from "@/components/Hero3D";
import JsonLd from "@/lib/jsonld";
import { getHome, getModels, getSeo } from "@/lib/server/catalog";
import { SITE_DESC, SITE_NAME, SITE_URL } from "@/lib/site";
import { ORG_ID, SITE_ID } from "@/lib/schema";
import { DEFAULT_PRICES, paidPrice } from "@/lib/pricing";
// Страница собирается на сервере из базы и кешируется на 5 минут (ISR); сохранение в админке
// сбрасывает кеш сразу, поэтому новые модели и цены видны без ожидания.
export const revalidate = 300;
export async function generateMetadata() {
  const seo = await getSeo();
  return { title: { absolute: seo.title }, description: seo.description, alternates: { canonical: "/" }, openGraph: { title: seo.title, description: seo.description, url: "/" } };
}

const MARQUEE = ["Авторские STL-модели", "Шёлковый PLA", "Режим вазы", "Файлы сразу после оплаты", "Отпечатки можно продавать", "2 + 1 в подарок", "Без регистрации", "Проверено печатью"];


export default async function Home() {
  const [list, h] = await Promise.all([getModels(), getHome()]);
  const [main, s1, s2] = h.hero;
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "OnlineStore", "@id": SITE_URL + "/#store", name: SITE_NAME, url: SITE_URL, description: SITE_DESC, parentOrganization: { "@id": ORG_ID },
            currenciesAccepted: "RUB", paymentAccepted: "СБП, банковская карта", image: SITE_URL + "/opengraph-image" },
          { "@type": "WebPage", "@id": SITE_URL + "/#home", url: SITE_URL, name: "lola.stl — авторские STL-модели для 3D-печати", isPartOf: { "@id": SITE_ID },
            primaryImageOfPage: SITE_URL + "/opengraph-image",
            mainEntity: { "@type": "ItemList", name: "Каталог STL-моделей", numberOfItems: list.length,
              itemListElement: list.map((m, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/models/${m.slug}`, name: m.name,
                image: m.photos?.[0] ? SITE_URL + m.photos[0] : undefined })) } },
        ],
      }} />

      <section className="hero-wrap">
        <Hero3D />
        <div className="hero-veil" aria-hidden="true" />
        <div className="wrap hero">
          <div className="hero-copy">
            <span className="eyebrow hero-kicker"><span className="eyebrow-line" /> {h.kicker}</span>
            <h1>{h.title}{h.titleEm && <><br /><em>{h.titleEm}</em></>}</h1>
            <p>{h.text}</p>
            <div className="hero-cta">
              <Link href="#catalog" className="button button-dark">Выбрать модель <ArrowRight size={17} /></Link>
              <Link href="#works" className="button button-outline">Смотреть отпечатки</Link>
            </div>
            <div className="hero-note">
              <span className="hero-avatar" aria-hidden="true">L</span>
              <span><b>{h.note}</b><small>{h.noteSmall}</small></span>
            </div>
          </div>
          <div className="hero-collage">
            <figure className="shot main">
              <Image src={main.src} alt={main.alt || ""} fill priority sizes="(max-width: 640px) 80vw, 34vw" />
            </figure>
            <figure className="shot side s1">
              <Image src={s1.src} alt={s1.alt || ""} fill sizes="(max-width: 640px) 36vw, 14vw" />
            </figure>
            <figure className="shot side s2">
              <Image src={s2.src} alt={s2.alt || ""} fill sizes="(max-width: 640px) 36vw, 14vw" />
            </figure>
          </div>
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map(k => (
            <div key={k} style={{ display: "flex", gap: 34 }}>
              {MARQUEE.map(t => <span key={t}>{t}</span>)}
            </div>
          ))}
        </div>
      </div>

      <div className="wrap" style={{ marginTop: 28 }}>
        <section className="benefit-row" aria-label="Почему здесь удобно">
          <div><span className="benefit-icon"><Download size={18} /></span><span><b>Файлы сразу</b><small>Ссылки открываются после оплаты</small></span></div>
          <div><span className="benefit-icon"><MailCheck size={18} /></span><span><b>Без регистрации</b><small>Чек и ссылки придут на email</small></span></div>
          <div><span className="benefit-icon"><Gift size={18} /></span><span><b>Подарки к заказу</b><small>За каждые 2 модели третья бесплатно</small></span></div>
        </section>
      </div>

      <section className="wrap section works" id="works" aria-labelledby="works-h" style={{ scrollMarginTop: 90 }}>
        <div className="section-heading">
          <div><span className="eyebrow">Из мастерской</span><h2 id="works-h">{h.galleryTitle}</h2></div>
          <Link href="#catalog" className="text-link">К моделям <ArrowRight size={16} /></Link>
        </div>
        <div className="gallery-grid">
          {h.gallery.map((g, i) => {
            const inner = <>
              <Image src={g.src} alt={g.alt || ""} fill sizes={g.size === "wide" ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 50vw, 25vw"} />
              {(g.tag || g.text) && <span className="g-cap">{g.tag && <span>{g.tag}</span>}{g.text}</span>}
            </>;
            const cls = "g-item " + (g.size || "");
            return g.href ? <Link key={i} href={g.href} className={cls}>{inner}</Link> : <div key={i} className={cls}>{inner}</div>;
          })}
        </div>
      </section>

      <section className="wrap section" id="catalog" style={{ scrollMarginTop: 90 }}>
        <div className="section-heading">
          <div><span className="eyebrow">Каталог моделей</span><h2>Найдите свою форму</h2></div>
        </div>
        <Catalog />
      </section>

      <div className="wrap">
        <section className="editorial" aria-labelledby="how-h">
          <div className="editorial-image"><Image src={h.editorial.src} alt={h.editorial.alt || ""} fill sizes="(max-width: 640px) 100vw, 50vw" /></div>
          <div className="editorial-copy">
            <span className="eyebrow">Как это работает</span>
            <h2 id="how-h">От файла — к любимой вещи</h2>
            <ol className="steps">
              <li><b>Выберите модели</b><span>Корзина сама посчитает подарки и итоговую цену.</span></li>
              <li><b>Оплатите картой или по СБП</b><span>Чек придёт на email. Аккаунт создавать не нужно.</span></li>
              <li><b>Скачайте файлы</b><span>Ссылки появятся в личном кабинете и придут письмом. В Telegram их пришлёт бот.</span></li>
            </ol>
            <Link href="#catalog" className="text-link">Выбрать модель <ArrowRight size={16} /></Link>
          </div>
        </section>
      </div>
    </>
  );
}
