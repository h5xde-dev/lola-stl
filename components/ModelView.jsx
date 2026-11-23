"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Gift, PenTool, Sparkles } from "lucide-react";
import ModelArt from "./ModelArt";
import ProductCard, { FavButton, useOffer } from "./ProductCard";
import { useStore } from "./Store";
import { catOf, categoryHref, kindName, related, modelAbout } from "@/lib/models";
import { paidPrice } from "@/lib/pricing";
import { rub, zipMb } from "@/lib/format";

// Страница модели. Данные приходят с сервера; если админка прототипа поменяла модель,
// после загрузки в браузере покажется изменённая версия.
export default function ModelView({ initial }) {
  const { s, byId, cats, toggleCart, promo } = useStore();
  const m = byId[initial.id] && !byId[initial.id].deleted ? { ...initial, ...byId[initial.id] } : initial;
  const { inCart, inSet, isOwned, gift, cost, hasSame } = useOffer(m);
  const [shot, setShot] = useState(0);
  const photos = m.photos || [];
  // Схема-рисунок — только если своих фото нет совсем
  const shots = photos.length ? photos : [null];
  const router = useRouter();
  // «Назад»: если пришли с другой страницы сайта — возвращаемся туда (каталог откроется на той же позиции),
  // если страницу открыли по ссылке извне — ведём в каталог.
  const [canBack, setCanBack] = useState(false);
  useEffect(() => { try { setCanBack(+sessionStorage.getItem("lola-nav") > 1); } catch {} }, []);
  const back = () => (canBack ? router.back() : router.push(cat ? categoryHref(cat) : "/#catalog"));
  const pr = s.prices;
  const rel = related(s.models, m, 4);
  const isBox = m.cat === "box";
  const cat = catOf(m, cats);

  const solo = !isBox && cat?.gifts === false; // категория вне акций, например лотки
  const giftText = isBox
    ? { b: "Боксы считаются отдельно", t: `Один бокс ${rub(pr.box[1])}, от 4 штук ${rub(pr.box4)} за каждый. Акции, подарки и промокоды на боксы не действуют.` }
    : solo
    ? { b: `${cat.name} — вне акций`, t: `Каждая модель ${rub(paidPrice(pr, 1))}. Подарки «2+1», «1+1» и промокоды на них не действуют.` }
    : promo
      ? { b: "Акция «1+1»", t: `К каждой оплаченной модели одна в подарок. Одна модель ${rub(paidPrice(pr, 1))}.` }
      : { b: "Подарок по «2+1»", t: `Возьмите две модели за ${rub(paidPrice(pr, 2))}, и третья будет бесплатно.` };

  return (
    <div className="inner-page">
      <button type="button" className="text-link back-link model-back" onClick={back}><ArrowLeft size={16} aria-hidden="true" /> {canBack ? "Назад" : "К моделям"}</button>
      <nav className="breadcrumbs" aria-label="Навигация">
        <Link href="/">Каталог</Link><span aria-hidden="true">/</span>
        {cat ? <Link href={categoryHref(cat)}>{cat.name}</Link> : <span>{kindName(m, cats)}</span>}<span aria-hidden="true">/</span>
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
          {photos.length > 1 && (
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
          <span className="eyebrow">{kindName(m, cats)} · цифровая модель{m.isNew ? " · новинка" : ""}</span>
          <h1>{m.name}</h1>
          <div className="detail-author"><PenTool size={14} aria-hidden="true" /> Авторская модель lola.stl</div>

          {isOwned
            ? <div className="detail-price in"><Check size={20} aria-hidden="true" /> Уже куплена</div>
            : inCart
            ? <div className="detail-price in"><Check size={20} aria-hidden="true" /> В корзине</div>
            : m.free
              ? <div className="detail-price gift">Бесплатно <small>файл придёт на email</small></div>
            : gift || cost === 0
              ? <div className="detail-price gift">0 ₽ <small>пойдёт в подарок</small></div>
              : <div className="detail-price">{hasSame ? "+" : ""}{rub(cost)} {hasSame && <small>к сумме заказа</small>}</div>}

          <p>{modelAbout(m, cats)}</p>

          <dl className="detail-specs">
            <div className="detail-spec"><dt>{(m.files || []).length > 1 ? `Файлы · ${m.files.length}` : "Формат файла"}</dt>
              <dd>{(m.files || []).length > 1 ? m.files.map(f => f.name).join(", ") + ` · ${m.mb} МБ` : `STL · ${m.mb} МБ`}</dd></div>
            <div className="detail-spec"><dt>Архив для скачивания</dt><dd>ZIP ≈ {zipMb(m)} МБ</dd></div>
            {m.dims && <div className="detail-spec"><dt>Размер после печати</dt><dd>{m.dims}</dd></div>}
            {m.print && <div className="detail-spec"><dt>Печать</dt><dd>{m.print}</dd></div>}
            {m.material && <div className="detail-spec"><dt>Пластик</dt><dd>{m.material}</dd></div>}
            <div className="detail-spec"><dt>Лицензия</dt><dd><Link href="/offer">личное использование и продажа отпечатков</Link></dd></div>
            <div className="detail-spec"><dt>Получение</dt><dd><Link href="/delivery">цифровой товар: ссылка на файлы {m.free ? "сразу после оформления" : "сразу после оплаты"}</Link></dd></div>
          </dl>

          {!m.free && <div className={"gift-note" + (promo && !isBox && !solo ? " on" : "")}>
            {isBox || solo ? <Sparkles size={20} aria-hidden="true" /> : <Gift size={20} aria-hidden="true" />}
            <span><b>{giftText.b}</b><small>{giftText.t}</small></span>
          </div>}

          <div className="detail-actions">
            {isOwned ? <Link href="/account" className="button button-dark full">Скачать в личном кабинете <ArrowRight size={17} /></Link>
            : inSet ? <Link href="/cart" className="button button-outline full">Входит в набор в корзине</Link>
            : <button type="button" className={"button full " + (inCart ? "button-outline" : gift ? "button-gift" : "button-dark")} onClick={() => toggleCart(m.id)}>
              {inCart ? "Убрать из корзины" : m.free ? <>Получить бесплатно <ArrowRight size={17} /></> : gift ? <><Gift size={17} /> Взять в подарок</> : <>Добавить в корзину <ArrowRight size={17} /></>}
            </button>}
            {inCart && !inSet && !isOwned && <Link href="/cart" className="button button-dark full">Перейти в корзину <ArrowRight size={17} /></Link>}
          </div>
          <p className="secure-note">{m.free ? "" : "Цена — за лицензию на файлы модели. "}Файлы останутся в личном кабинете, их можно скачать повторно. <Link href="/payment">Оплата</Link> · <Link href="/refund">Возврат</Link></p>
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
