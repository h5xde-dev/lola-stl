"use client";
import { useStore } from "./Store";
import { paidPrice } from "@/lib/pricing";
import { fmtDay, models, rub } from "@/lib/format";

export default function Tiers() {
  const { s, promo: p } = useStore();
  const pr = s.prices;
  const rows = [1, 2, 4, 6].map(a => [a, p ? a : Math.floor(a / 2), paidPrice(pr, a)]);
  return (
    <section className={"tiers-box" + (p ? " promo" : "")} aria-label="Цены">
      <div className="tiers-head">
        <b>{p ? "Сейчас действует «1+1»: за каждую оплаченную модель одна в подарок" : "Кашпо и модели: за каждые 2 оплаченные модели одна в подарок"}</b>
        {p && <span className="promo-pill">Акция до {fmtDay(s.promoEnd)}</span>}
      </div>
      <div className="tiers">
        {rows.map(([a, g, price]) => (
          <div className="tier" key={a}>
            <span className="tier-n">{a}{g ? <> <span className="g">+ {g}</span></> : null}</span>
            <span className="tier-sub">{g ? models(a + g) + " всего" : "1 модель"}</span>
            <span className="tier-p">{rub(price)}</span>
          </div>
        ))}
        {p
          ? <div className="tier"><span className="tier-n">16+</span><span className="tier-sub">моделей всего</span><span className="tier-p">{rub(pr.per8 / 2)} за модель</span></div>
          : <div className="tier"><span className="tier-n">8+ <span className="g">+ 50%</span></span><span className="tier-sub">оплаченных моделей</span><span className="tier-p">{rub(pr.per8)} за модель</span></div>}
      </div>
      <div className="tiers-foot">
        <span>{p ? `Боксы по акции: ${rub(pr.boxPromo)} за штуку` : `Боксы: 1 — ${rub(pr.box[1])}, 2 — ${rub(pr.box[2])}, 3 — ${rub(pr.box[3])}, от 4 — ${rub(pr.box4)} за штуку`}</span>
        <span>На боксы подарки не распространяются</span>
      </div>
    </section>
  );
}
