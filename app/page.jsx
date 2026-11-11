import Catalog from "@/components/Catalog";
import JsonLd from "@/lib/jsonld";
import { getModels } from "@/lib/models";
import { SITE_DESC, SITE_NAME, SITE_URL } from "@/lib/site";

// Страница собирается на сервере при каждом запросе: каталог берётся из getModels(),
// поэтому после подключения базы новые модели появятся без пересборки.
export const dynamic = "force-dynamic";

export default async function Home() {
  const list = await getModels();
  return (
    <div className="wrap">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebSite", "@id": SITE_URL + "/#site", url: SITE_URL, name: SITE_NAME, description: SITE_DESC, inLanguage: "ru" },
          { "@type": "Store", "@id": SITE_URL + "/#store", name: SITE_NAME, url: SITE_URL, description: SITE_DESC, currenciesAccepted: "RUB", paymentAccepted: "СБП, банковская карта" },
          { "@type": "ItemList", name: "Каталог STL-моделей", numberOfItems: list.length,
            itemListElement: list.map((m, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/models/${m.slug}`, name: m.name })) },
        ],
      }} />
      <section className="hero">
        <h1>STL-модели кашпо, которых нет у десятков продавцов</h1>
        <p>Для тех, кто печатает на продажу или для души. Отпечатки можно продавать. Файлы приходят сразу после оплаты, регистрация не нужна.</p>
      </section>
      <Catalog />
      <section className="how site-only">
        <h2>Как проходит покупка</h2>
        <ol className="steps">
          <li><b>Выберите модели</b><span>Корзина сама посчитает подарки и итоговую цену.</span></li>
          <li><b>Оплатите картой или по СБП</b><span>Чек придёт на email. Аккаунт создавать не нужно.</span></li>
          <li><b>Скачайте файлы</b><span>Ссылки появятся в «Моих покупках» и придут письмом. В Telegram их пришлёт бот.</span></li>
        </ol>
      </section>
    </div>
  );
}
