"use client";
import Link from "next/link";
import { useState } from "react";
import ModelArt from "./ModelArt";
import ProductCard, { PriceLine, useOffer } from "./ProductCard";
import { useStore } from "./Store";
import { catName, related } from "@/lib/models";
import { paidPrice } from "@/lib/pricing";
import { rub, zipMb } from "@/lib/format";

// Страница модели. Данные приходят с сервера; если админка прототипа поменяла модель,
// после загрузки в браузере покажется изменённая версия.
export default function ModelView({ initial }) {
  const { s, byId, toggleCart, promo } = useStore();
  const m = byId[initial.id] && !byId[initial.id].deleted ? { ...initial, ...byId[initial.id] } : initial;
  const { inCart, gift } = useOffer(m);
  const [shot, setShot] = useState(0);
  const photos = m.photos || [];
  const pr = s.prices;
  const rel = related(s.models, m, 4);
  const isBox = m.cat === "box";

  return (
    <div className="wrap page product">
      <nav className="crumbs" aria-label="Навигация">
        <Link href="/">Каталог</Link><span aria-hidden="true">/</span>
        <span>{isBox ? "Боксы" : "Кашпо"}</span><span aria-hidden="true">/</span>
        <span aria-current="page">{m.name}</span>
      </nav>

      <div className="pdp">
        <div className="gallery">
          <div className="bed big">
            {shot === 0 || !photos[shot - 1] ? <ModelArt m={m} uid={"p-" + m.id} photo={false} /> : <img src={photos[shot - 1]} alt={`${m.name}, фото ${shot}`} />}
            <span className="badges">
              {m.isNew && <span className="badge new">Новинка</span>}
              {m.vase && <span className="badge">Режим вазы</span>}
            </span>
          </div>
          {photos.length > 0 && (
            <div className="thumbs" role="group" aria-label="Изображения">
              {[null, ...photos].map((p, i) => (
                <button key={i} type="button" className="bed" aria-pressed={shot === i} aria-label={i ? `Фото ${i}` : "Схема модели"} onClick={() => setShot(i)}>
                  {p ? <img src={p} alt="" /> : <ModelArt m={m} uid={"t-" + m.id} photo={false} />}
                </button>
              ))}
            </div>
          )}
          {!photos.length && <p className="note">Фото готовых отпечатков владелец загружает в админке. Пока вместо фото показана схема модели.</p>}
        </div>

        <div className="pdp-b">
          <span className="kind">{catName(m.cat)}{m.isNew ? " · новинка" : ""}</span>
          <h1>{m.name}</h1>
          {m.desc && <p className="lead">{m.desc}</p>}

          <div className={"buy" + (promo ? " promo" : "")}>
            <div className="buy-p"><PriceLine m={m} /></div>
            <button type="button" className={"btn primary block" + (inCart ? " ghost" : "")} onClick={() => toggleCart(m.id)}>
              {inCart ? "Убрать из корзины" : gift ? "Взять в подарок" : "Добавить в корзину"}
            </button>
            {inCart && <Link href="/cart" className="btn block" style={{ textAlign: "center", textDecoration: "none" }}>Перейти в корзину</Link>}
            <p className="note">
              {isBox
                ? (promo ? `По акции любой бокс ${rub(pr.boxPromo)}. ` : `Один бокс ${rub(pr.box[1])}, от 4 штук ${rub(pr.box4)} за каждый. `) + "Подарки на боксы не действуют."
                : promo
                  ? `Акция «1+1»: к каждой оплаченной модели одна в подарок. Одна модель ${rub(paidPrice(pr, 1))}.`
                  : `Одна модель ${rub(paidPrice(pr, 1))}. Возьмите две за ${rub(paidPrice(pr, 2))}, и третья будет в подарок.`}
            </p>
          </div>

          <dl className="specs">
            <div><dt>Файл</dt><dd>STL, {m.mb} МБ (ZIP ≈ {zipMb(m)} МБ)</dd></div>
            <div><dt>Размер</dt><dd>{m.dims || "—"}</dd></div>
            <div><dt>Печать</dt><dd>{m.print || "—"}</dd></div>
            <div><dt>Лицензия</dt><dd>личное использование и продажа отпечатков</dd></div>
            <div><dt>Доставка</dt><dd>ссылка сразу после оплаты, в письме и в «Моих покупках»</dd></div>
          </dl>
        </div>
      </div>

      {rel.length > 0 && (
        <section className="related" aria-labelledby="rel-h">
          <h2 id="rel-h">Похожие модели</h2>
          <div className="grid">{rel.map(r => <ProductCard key={r.id} m={r} />)}</div>
        </section>
      )}
    </div>
  );
}
