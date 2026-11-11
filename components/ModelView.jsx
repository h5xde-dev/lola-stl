"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Gift, PenTool, Sparkles } from "lucide-react";
import ModelArt from "./ModelArt";
import ProductCard, { FavButton, useOffer } from "./ProductCard";
import { useStore } from "./Store";
import { kindName, related } from "@/lib/models";
import { paidPrice } from "@/lib/pricing";
import { rub, zipMb } from "@/lib/format";

// Страница модели. Данные приходят с сервера; если админка прототипа поменяла модель,
// после загрузки в браузере покажется изменённая версия.
export default function ModelView({ initial }) {
  const { s, byId, toggleCart, promo } = useStore();
  const m = byId[initial.id] && !byId[initial.id].deleted ? { ...initial, ...byId[initial.id] } : initial;
  const { inCart, gift, cost, hasSame } = useOffer(m);
  const [shot, setShot] = useState(0);
  const photos = m.photos || [];
  const shots = [...photos, null];
  const pr = s.prices;
  const rel = related(s.models, m, 4);
  const isBox = m.cat === "box";

  const giftText = isBox
    ? { b: "Боксы считаются отдельно", t: (promo ? `По акции любой бокс ${rub(pr.boxPromo)}. ` : `Один бокс ${rub(pr.box[1])}, от 4 штук ${rub(pr.box4)} за каждый. `) + "Подарки на боксы не действуют." }
    : promo
      ? { b: "Акция «1+1»", t: `К каждой оплаченной модели одна в подарок. Одна модель ${rub(paidPrice(pr, 1))}.` }
      : { b: "Подарок по «2+1»", t: `Возьмите две модели за ${rub(paidPrice(pr, 2))}, и третья будет бесплатно.` };

  return (
    <div className="inner-page">
      <nav className="breadcrumbs" aria-label="Навигация">
        <Link href="/">Каталог</Link><span aria-hidden="true">/</span>
        <span>{isBox ? "Боксы" : kindName(m)}</span><span aria-hidden="true">/</span>
        <span aria-current="page">{m.name}</span>
      </nav>

      <div className="product-detail">
        <div className="gallery">
          <div className="product-image-link">
            <div className="detail-image">
              {shots[shot]
                ? (shots[shot].startsWith("/") ? <Image src={shots[shot]} alt={`${m.name}, фото ${shot + 1}`} fill priority sizes="(max-width: 900px) 100vw, 55vw" style={{ objectFit: "cover" }} /> : <img src={shots[shot]} alt={`${m.name}, фото ${shot + 1}`} />)
                : <ModelArt m={m} uid={"p-" + m.id} photo={false} />}
            </div>
            <span className="product-tags">
              {m.isNew && <span className="product-tag new">Новинка</span>}
              {m.vase && <span className="product-tag">Режим вазы</span>}
              {!m.isNew && !m.vase && <span className="product-tag">STL-модель</span>}
            </span>
            <FavButton m={m} />
          </div>
          {photos.length > 0 && (
            <div className="thumbs" role="group" aria-label="Изображения">
              {shots.map((p, i) => (
                <button key={i} type="button" aria-pressed={shot === i} aria-label={p ? `Фото ${i + 1}` : "Схема модели"} onClick={() => setShot(i)}>
                  {p ? (p.startsWith("/") ? <Image src={p} alt="" fill sizes="72px" style={{ objectFit: "cover" }} /> : <img src={p} alt="" />) : <ModelArt m={m} uid={"t-" + m.id} photo={false} />}
                </button>
              ))}
            </div>
          )}
          {!photos.length && <p className="note">Фото готовых отпечатков владелец загружает в админке. Пока вместо фото показана схема модели.</p>}
        </div>

        <div className="detail-copy">
          <span className="eyebrow">{kindName(m)} · цифровая модель{m.isNew ? " · новинка" : ""}</span>
          <h1>{m.name}</h1>
          <div className="detail-author"><PenTool size={14} aria-hidden="true" /> Авторская модель lola.stl</div>

          {inCart
            ? <div className="detail-price in"><Check size={20} aria-hidden="true" /> В корзине</div>
            : gift || cost === 0
              ? <div className="detail-price gift">0 ₽ <small>пойдёт в подарок</small></div>
              : <div className="detail-price">{hasSame ? "+" : ""}{rub(cost)} {hasSame && <small>к сумме заказа</small>}</div>}

          {m.desc && <p>{m.desc}</p>}

          <dl className="detail-specs">
            <div className="detail-spec"><dt>Формат файла</dt><dd>STL · {m.mb} МБ</dd></div>
            <div className="detail-spec"><dt>Архив для скачивания</dt><dd>ZIP ≈ {zipMb(m)} МБ</dd></div>
            {m.dims && <div className="detail-spec"><dt>Размер после печати</dt><dd>{m.dims}</dd></div>}
            {m.print && <div className="detail-spec"><dt>Печать</dt><dd>{m.print}</dd></div>}
            <div className="detail-spec"><dt>Лицензия</dt><dd>личное использование и продажа отпечатков</dd></div>
            <div className="detail-spec"><dt>Доставка</dt><dd>сразу после оплаты</dd></div>
          </dl>

          <div className={"gift-note" + (promo && !isBox ? " on" : "")}>
            {isBox ? <Sparkles size={20} aria-hidden="true" /> : <Gift size={20} aria-hidden="true" />}
            <span><b>{giftText.b}</b><small>{giftText.t}</small></span>
          </div>

          <div className="detail-actions">
            <button type="button" className={"button full " + (inCart ? "button-outline" : gift ? "button-gift" : "button-dark")} onClick={() => toggleCart(m.id)}>
              {inCart ? "Убрать из корзины" : gift ? <><Gift size={17} /> Взять в подарок</> : <>Добавить в корзину <ArrowRight size={17} /></>}
            </button>
            {inCart && <Link href="/cart" className="button button-dark full">Перейти в корзину <ArrowRight size={17} /></Link>}
          </div>
          <p className="secure-note">Файлы останутся в «Моих покупках», их можно скачать повторно.</p>
        </div>
      </div>

      {rel.length > 0 && (
        <section className="related-section" aria-labelledby="rel-h">
          <div className="section-heading"><div><span className="eyebrow">Похожие модели</span><h2 id="rel-h">Продолжите коллекцию</h2></div></div>
          <div className="product-grid">{rel.map(r => <ProductCard key={r.id} m={r} />)}</div>
        </section>
      )}
    </div>
  );
}
