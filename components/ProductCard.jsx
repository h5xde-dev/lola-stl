"use client";
import Link from "next/link";
import { Check, Download, Gift, Heart, Layers, Plus } from "lucide-react";
import ModelArt from "./ModelArt";
import { useStore } from "./Store";
import { addCost, quote, setId } from "@/lib/pricing";
import { kindName, modelHref } from "@/lib/models";
import { rub } from "@/lib/format";

// Что покупатель видит на кнопке и в строке цены, с учётом того, что уже лежит в корзине.
export function useOffer(m) {
  const { s, Q, owned } = useStore();
  const isOwned = owned.has(m.id);
  const inSet = Q.bundles.some(x => x.b.items.includes(m.id));
  const inCart = s.cart.includes(m.id) || inSet;
  const cost = addCost(Q, m);
  const gift = !inCart && m.cat === "plant" && Q.pq.free > 0;
  const hasSame = m.cat === "box" ? Q.boxes.length > 0 : Q.plants.length > 0;
  return { inCart, inSet, isOwned, gift, cost, hasSame };
}

export function PriceLine({ m }) {
  const { inCart, inSet, isOwned, gift, cost, hasSame } = useOffer(m);
  if (isOwned) return <span className="price owned"><Check size={13} aria-hidden="true" /> Куплено</span>;
  if (inSet) return <span className="price in"><Layers size={13} aria-hidden="true" /> В наборе</span>;
  if (inCart) return <span className="price in"><Check size={13} aria-hidden="true" /> В корзине</span>;
  if (gift || cost === 0) return <span className="price gift">0 ₽<small>в подарок</small></span>;
  return <span className="price">{hasSame ? "+" : ""}{rub(cost)}{hasSame && <small>к заказу</small>}</span>;
}

export function FavButton({ m }) {
  const { s, toggleFav } = useStore();
  const on = (s.favs || []).includes(m.id);
  return (
    <button type="button" className="favorite-button" aria-pressed={on} aria-label={on ? `Убрать «${m.name}» из избранного` : `Добавить «${m.name}» в избранное`}
      onClick={e => { e.preventDefault(); toggleFav(m.id); }}>
      <Heart size={17} aria-hidden="true" />
    </button>
  );
}

export default function ProductCard({ m }) {
  const { toggleCart, cats } = useStore();
  const { inCart, inSet, isOwned, gift } = useOffer(m);
  const href = modelHref(m);
  const photo = m.photos && m.photos.length > 0;
  return (
    <article className={"product-card" + (inCart ? " is-in" : "") + (photo ? " has-photo" : "")}>
      <div className="product-media">
        <Link href={href} className="product-image" aria-label={`${m.name}: подробнее`} tabIndex={-1}>
          <ModelArt m={m} uid={"c-" + m.id} />
        </Link>
        <span className="product-tags">
          {m.isNew && <span className="product-tag new">Новинка</span>}
          {m.vase && <span className="product-tag">Режим вазы</span>}
          {!photo && <span className="product-tag">Схема</span>}
        </span>
        <FavButton m={m} />
      </div>
      <div className="product-body">
        <div className="product-top"><span className="eyebrow">{kindName(m, cats)}</span><span className="product-size">STL · {m.mb} МБ</span></div>
        <h3><Link href={href}>{m.name}</Link></h3>
        {m.desc && <p className="product-desc">{m.desc}</p>}
        <div className="product-foot">
          <PriceLine m={m} />
          {isOwned
            ? <Link href="/account" className="add-button owned" aria-label={`«${m.name}» уже куплена — скачать`} title="Скачать в личном кабинете"><Download size={17} /></Link>
            : <button type="button" className={"add-button" + (inCart ? " in" : gift ? " gift" : "")} aria-pressed={inCart} disabled={inSet}
                aria-label={inSet ? `«${m.name}» входит в набор в корзине` : inCart ? `Убрать «${m.name}» из корзины` : gift ? `Взять «${m.name}» в подарок` : `Добавить «${m.name}» в корзину`}
                title={inSet ? "Входит в набор" : inCart ? "Убрать из корзины" : gift ? "Взять в подарок" : "В корзину"}
                onClick={() => toggleCart(m.id)}>
                {inCart ? <Check size={18} /> : gift ? <Gift size={17} /> : <Plus size={18} />}
              </button>}
        </div>
      </div>
    </article>
  );
}

// Карточка набора: коллаж из моделей, цена набора, обычная цена и экономия.
export function BundleCard({ b }) {
  const { s, byId, owned, toggleCart, Q } = useStore();
  const items = b.items.map(id => byId[id]).filter(Boolean);
  const id = setId(b);
  const inCart = s.cart.includes(id);
  const x = Q.bundles.find(z => z.id === id);
  const missing = items.filter(m => !owned.has(m.id));
  // Обычная цена тех же моделей по «2+1», без промокодов и скидок
  const regular = quote({ ...s, cart: missing.map(m => m.id), bundles: [], code: "", loyalty: { on: false } }, byId).total;
  const price = x ? x.price : quote({ ...s, cart: [id], code: "", loyalty: { on: false } }, byId).bundleTotal;
  if (!missing.length) return null;
  return (
    <article className={"bundle-card" + (inCart ? " is-in" : "")}>
      <div className="bundle-art" aria-hidden="true">
        {items.slice(0, 3).map(m => <div key={m.id} className="bundle-shot"><ModelArt m={m} uid={"bc-" + b.id + m.id} sizes="(max-width: 640px) 33vw, 15vw" /></div>)}
      </div>
      <div className="bundle-body">
        <span className="eyebrow"><Layers size={12} aria-hidden="true" /> Набор · {items.length} {items.length > 4 ? "моделей" : "модели"}</span>
        <h3>{b.name}</h3>
        {b.desc && <p className="product-desc">{b.desc}</p>}
        <p className="bundle-items">{items.map(m => m.name).join(" · ")}</p>
        <div className="product-foot">
          <span className="price">{rub(price)}{regular > price && <small>вместо {rub(regular)}</small>}</span>
          <button type="button" className={"button " + (inCart ? "button-outline" : "button-dark")} onClick={() => toggleCart(id)}>
            {inCart ? "Убрать набор" : "Взять набор"}
          </button>
        </div>
        {missing.length < items.length && <small className="note">Часть моделей у вас уже есть — цена пересчитана.</small>}
      </div>
    </article>
  );
}
