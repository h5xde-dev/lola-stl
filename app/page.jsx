import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Download, Gift, MailCheck } from "lucide-react";
import Catalog from "@/components/Catalog";
import JsonLd from "@/lib/jsonld";
import { getModels } from "@/lib/models";
import { SITE_DESC, SITE_NAME, SITE_URL } from "@/lib/site";
import heroImg from "@/public/images/hero-neon.jpg";
import editorialImg from "@/public/images/editorial.jpg";

// Страница собирается на сервере при каждом запросе: каталог берётся из getModels(),
// поэтому после подключения базы новые модели появятся без пересборки.
export const dynamic = "force-dynamic";

export default async function Home() {
  const list = await getModels();
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebSite", "@id": SITE_URL + "/#site", url: SITE_URL, name: SITE_NAME, description: SITE_DESC, inLanguage: "ru" },
          { "@type": "Store", "@id": SITE_URL + "/#store", name: SITE_NAME, url: SITE_URL, description: SITE_DESC, currenciesAccepted: "RUB", paymentAccepted: "СБП, банковская карта" },
          { "@type": "ItemList", name: "Каталог STL-моделей", numberOfItems: list.length,
            itemListElement: list.map((m, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/models/${m.slug}`, name: m.name })) },
        ],
      }} />

      <section className="wrap hero">
        <div className="hero-copy">
          <span className="eyebrow hero-kicker"><span className="eyebrow-line" /> STL-модели для 3D-печати</span>
          <h1>Кашпо, которых<br /><em>нет у других.</em></h1>
          <p>Авторские модели для тех, кто печатает на продажу или для души. Отпечатки можно продавать. Файлы приходят сразу после оплаты, регистрация не нужна.</p>
          <div className="hero-cta">
            <Link href="#catalog" className="button button-dark">Выбрать модель <ArrowRight size={17} /></Link>
          </div>
          <div className="hero-note">
            <span className="hero-avatar" aria-hidden="true">L</span>
            <span><b>Каждая модель проверена печатью</b><small>Около 130 моделей, каталог пополняется</small></span>
          </div>
        </div>
        <div className="hero-art">
          <div className="hero-photo"><Image src={heroImg} alt="Напечатанное кашпо «Глубина» с щупальцами в бирюзово-розовом пластике" priority sizes="(max-width: 640px) 100vw, 50vw" placeholder="blur" /></div>
          <div className="hero-caption" aria-hidden="true"><span>КОЛЛЕКЦИЯ № 01</span><strong>Неоновая<br />серия</strong><ArrowDown size={18} /></div>
          <div className="hero-stamp" aria-hidden="true">СОЗДАНО<br />ДЛЯ ПЕЧАТИ</div>
        </div>
      </section>

      <div className="wrap">
        <section className="benefit-row" aria-label="Почему здесь удобно">
          <div><span className="benefit-icon"><Download size={18} /></span><span><b>Файлы сразу</b><small>Ссылки открываются после оплаты</small></span></div>
          <div><span className="benefit-icon"><MailCheck size={18} /></span><span><b>Без регистрации</b><small>Чек и ссылки придут на email</small></span></div>
          <div><span className="benefit-icon"><Gift size={18} /></span><span><b>Подарки к заказу</b><small>За каждые 2 модели третья бесплатно</small></span></div>
        </section>
      </div>

      <section className="wrap section" id="catalog" style={{ scrollMarginTop: 90 }}>
        <div className="section-heading">
          <div><span className="eyebrow">Каталог моделей</span><h2>Найдите свою форму</h2></div>
        </div>
        <Catalog />
      </section>

      <div className="wrap">
        <section className="editorial" aria-labelledby="how-h">
          <div className="editorial-image"><Image src={editorialImg} alt="Скульптурная форма, напечатанная на 3D-принтере" sizes="(max-width: 640px) 100vw, 50vw" placeholder="blur" /></div>
          <div className="editorial-copy">
            <span className="eyebrow">Как это работает</span>
            <h2 id="how-h">От файла —<br />к любимой вещи.</h2>
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
