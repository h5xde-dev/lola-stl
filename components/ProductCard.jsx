"use client";
import Link from "next/link";
import ModelArt from "./ModelArt";
import { useStore } from "./Store";
import { addCost } from "@/lib/pricing";
import { catName, modelHref } from "@/lib/models";
import { rub } from "@/lib/format";

// Что покупатель видит на кнопке и в строке цены, с учётом того, что уже лежит в корзине.
export function useOffer(m) {
  const { s, Q } = useStore();
  const inCart = s.cart.includes(m.id);
  const cost = addCost(Q, m);
  const gift = !inCart && m.cat === "plant" && Q.pq.free > 0;
  const hasSame = m.cat === "box" ? Q.boxes.length > 0 : Q.plants.length > 0;
  const label = inCart ? "В корзине" : gift ? "Взять в подарок" : "В корзину";
  return { inCart, gift, cost, hasSame, label };
}

export function PriceLine({ m }) {
  const { inCart, gift, cost, hasSame } = useOffer(m);
  if (inCart) return <span className="price in">✓ Уже в корзине</span>;
  if (gift || cost === 0) return <span className="price gift">0 ₽ <small>в подарок</small></span>;
  return <span className="price">{hasSame ? "+" : ""}{rub(cost)}{hasSame ? <small> к заказу</small> : null}</span>;
}

export default function ProductCard({ m, priority }) {
  const { toggleCart } = useStore();
  const { inCart, gift, label } = useOffer(m);
  const href = modelHref(m);
  return (
    <article className={"card" + (inCart ? " is-in" : "")}>
      <Link href={href} className="bed" aria-label={`${m.name}: подробнее`} prefetch={priority ? true : undefined}>
        <ModelArt m={m} uid={"c-" + m.id} />
        <span className="badges">
          {m.isNew && <span className="badge new">Новинка</span>}
          {m.vase && <span className="badge">Режим вазы</span>}
        </span>
        {m.mb >= 200 && <span className="badge big corner">{m.mb} МБ</span>}
      </Link>
      <div className="card-b">
        <div className="card-t">
          <h3><Link href={href}>{m.name}</Link></h3>
          <span className="kind">{catName(m.cat)}</span>
        </div>
        {m.desc && <p className="card-d">{m.desc}</p>}
        <p className="meta">{(m.dims || "").replace(/ мм$/, "")} мм · {m.mb} МБ</p>
        <div className="card-f">
          <PriceLine m={m} />
          <button type="button" className={"btn add" + (inCart ? " in" : "") + (gift ? " gift" : "")} aria-pressed={inCart} onClick={() => toggleCart(m.id)}
            aria-label={inCart ? `Убрать «${m.name}» из корзины` : `${label}: «${m.name}»`}>
            {inCart ? "Убрать" : gift ? "В подарок" : "В корзину"}
          </button>
        </div>
      </div>
    </article>
  );
}
