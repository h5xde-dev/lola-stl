import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Download, Gift, MailCheck } from "lucide-react";
import Catalog from "@/components/Catalog";
import Hero3D from "@/components/Hero3D";
import JsonLd from "@/lib/jsonld";
import { getModels } from "@/lib/models";
import { SITE_DESC, SITE_NAME, SITE_URL } from "@/lib/site";
import { ORG_ID, SITE_ID } from "@/lib/schema";
import { DEFAULT_PRICES, paidPrice } from "@/lib/pricing";
import glubina from "@/public/images/works/glubina.jpg";
import romashki from "@/public/images/works/romashki.jpg";
import grani from "@/public/images/works/grani.jpg";
import puzyri from "@/public/images/works/puzyri.jpg";
import korall from "@/public/images/works/korall.jpg";
import rassada9 from "@/public/images/works/rassada-9.jpg";
import leopard from "@/public/images/works/rassada-leopard.jpg";

// Страница собирается на сервере при каждом запросе: каталог берётся из getModels(),
// поэтому после подключения базы новые модели появятся без пересборки.
export const dynamic = "force-dynamic";
export const metadata = { alternates: { canonical: "/" } };

const MARQUEE = ["Авторские STL-модели", "Шёлковый PLA", "Режим вазы", "Файлы сразу после оплаты", "Отпечатки можно продавать", "2 + 1 в подарок", "Без регистрации", "Проверено печатью"];

const GALLERY = [
  { img: puzyri, slug: "puzyri", cls: "tall", tag: "Пара кашпо", text: "Пузырьковая текстура", alt: "Два кашпо с пузырьковой текстурой в сине-фиолетовом пластике" },
  { img: rassada9, slug: "lotok-kapli", cls: "wide", tag: "Лоток", text: "Для рассады на 9 горшков", alt: "Лоток для рассады на девять горшков с точечной текстурой" },
  { img: grani, slug: "grani", cls: "tall", tag: "Кашпо", text: "Гранёная поверхность", alt: "Фиолетовое кашпо с гранёной поверхностью" },
  { img: korall, slug: "korall", cls: "", tag: "Пара кашпо", text: "Коралловый рельеф", alt: "Два кашпо с волнистым коралловым рельефом" },
  { img: romashki, slug: "romashki", cls: "", tag: "Шёлковый PLA", text: "Кашпо с ромашками", alt: "Кашпо с рельефными ромашками в трёхцветном шёлковом пластике" },
];

export default async function Home() {
  const list = await getModels();
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
            <span className="eyebrow hero-kicker"><span className="eyebrow-line" /> STL-модели для 3D-печати</span>
            <h1>Кашпо, которых<br /><em>нет у других</em></h1>
            <p>Авторские модели для тех, кто печатает на продажу или для души. Отпечатки можно продавать. Файлы приходят сразу после оплаты, регистрация не нужна.</p>
            <div className="hero-cta">
              <Link href="#catalog" className="button button-dark">Выбрать модель <ArrowRight size={17} /></Link>
              <Link href="#works" className="button button-outline">Смотреть отпечатки</Link>
            </div>
            <div className="hero-note">
              <span className="hero-avatar" aria-hidden="true">L</span>
              <span><b>Каждая модель проверена печатью</b><small>Около 130 моделей, каталог пополняется</small></span>
            </div>
          </div>
          <div className="hero-collage">
            <figure className="shot main">
              <Image src={glubina} alt="Напечатанное кашпо «Глубина» с щупальцами в бирюзово-розовом шёлковом пластике" priority sizes="(max-width: 640px) 80vw, 34vw" placeholder="blur" />
            </figure>
            <figure className="shot side s1">
              <Image src={romashki} alt="Кашпо с рельефными ромашками" sizes="(max-width: 640px) 36vw, 14vw" placeholder="blur" />
            </figure>
            <figure className="shot side s2">
              <Image src={grani} alt="Гранёное фиолетовое кашпо" sizes="(max-width: 640px) 36vw, 14vw" placeholder="blur" />
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
          <div><span className="eyebrow">Из мастерской</span><h2 id="works-h">Так модели выглядят после печати</h2></div>
          <Link href="#catalog" className="text-link">К моделям <ArrowRight size={16} /></Link>
        </div>
        <div className="gallery-grid">
          {GALLERY.map(g => (
            <Link key={g.text} href={`/models/${g.slug}`} className={"g-item " + g.cls}>
              <Image src={g.img} alt={g.alt} sizes="(max-width: 640px) 50vw, 25vw" placeholder="blur" />
              <span className="g-cap"><span>{g.tag}</span>{g.text}</span>
            </Link>
          ))}
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
          <div className="editorial-image"><Image src={leopard} alt="Ящик для рассады с леопардовой текстурой под фитолампой" sizes="(max-width: 640px) 100vw, 50vw" placeholder="blur" /></div>
          <div className="editorial-copy">
            <span className="eyebrow">Как это работает</span>
            <h2 id="how-h">От файла — к любимой вещи</h2>
            <ol className="steps">
              <li><b>Выберите модели</b><span>Корзина сама посчитает подарки и итоговую цену.</span></li>
              <li><b>Оплатите картой или по СБП</b><span>Чек придёт на email. Аккаунт создавать не нужно.</span></li>
              <li><b>Скачайте файлы</b><span>Ссылки появятся в «Моих покупках» и придут письмом. В Telegram их пришлёт бот.</span></li>
            </ol>
            <Link href="#catalog" className="text-link">Выбрать модель <ArrowRight size={16} /></Link>
          </div>
        </section>
      </div>
    </>
  );
}
