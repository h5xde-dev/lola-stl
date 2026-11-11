"use client";
import Link from "next/link";
import { Check, Gift, Heart, Plus } from "lucide-react";
import ModelArt from "./ModelArt";
import { useStore } from "./Store";
import { addCost } from "@/lib/pricing";
import { kindName, modelHref } from "@/lib/models";
import { rub } from "@/lib/format";

// Что покупатель видит на кнопке и в строке цены, с учётом того, что уже лежит в корзине.
export function useOffer(m) {
  const { s, Q } = useStore();
  const inCart = s.cart.includes(m.id);
  const cost = addCost(Q, m);
  const gift = !inCart && m.cat === "plant" && Q.pq.free > 0;
  const hasSame = m.cat === "box" ? Q.boxes.length > 0 : Q.plants.length > 0;
  return { inCart, gift, cost, hasSame };
}

export function PriceLine({ m }) {
  const { inCart, gift, cost, hasSame } = useOffer(m);
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
  const { toggleCart } = useStore();
  const { inCart, gift } = useOffer(m);
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
        <div className="product-top"><span className="eyebrow">{kindName(m)}</span><span className="product-size">STL · {m.mb} МБ</span></div>
        <h3><Link href={href}>{m.name}</Link></h3>
        {m.desc && <p className="product-desc">{m.desc}</p>}
        <div className="product-foot">
          <PriceLine m={m} />
          <button type="button" className={"add-button" + (inCart ? " in" : gift ? " gift" : "")} aria-pressed={inCart}
            aria-label={inCart ? `Убрать «${m.name}» из корзины` : gift ? `Взять «${m.name}» в подарок` : `Добавить «${m.name}» в корзину`}
            title={inCart ? "Убрать из корзины" : gift ? "Взять в подарок" : "В корзину"}
            onClick={() => toggleCart(m.id)}>
            {inCart ? <Check size={18} /> : gift ? <Gift size={17} /> : <Plus size={18} />}
          </button>
        </div>
      </div>
    </article>
  );
}
