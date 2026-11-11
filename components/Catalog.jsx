"use client";
import ProductCard from "./ProductCard";
import Tiers from "./Tiers";
import { useStore } from "./Store";
import { models } from "@/lib/format";

const CHIPS = [["all", "Все"], ["plant", "Кашпо"], ["box", "Боксы"], ["new", "Новинки"]];

export default function Catalog() {
  const { s, set } = useStore();
  const pub = s.models.filter(m => !m.hidden && !m.deleted);
  const q = s.q.trim().toLowerCase();
  const list = pub.filter(m => (s.filter === "all" || (s.filter === "new" ? m.isNew : m.cat === s.filter)) && (!q || m.name.toLowerCase().includes(q)));
  return (
    <>
      <Tiers />
      <div className="bar">
        <div className="chips">
          {CHIPS.map(([k, t]) => <button key={k} type="button" className="chip" aria-pressed={s.filter === k} onClick={() => set({ filter: k })}>{t}</button>)}
        </div>
        <input className="search" type="search" placeholder="Найти по названию" value={s.q} onChange={e => set({ q: e.target.value })} aria-label="Поиск по названию" />
      </div>
      <p className="count-note">Показано {models(list.length)} из {pub.length}. В магазине будет весь каталог, около 130 моделей.</p>
      <div className="grid">
        {list.length ? list.map((m, i) => <ProductCard key={m.id} m={m} priority={i < 4} />)
          : <div className="empty" style={{ gridColumn: "1/-1" }}>Ничего не нашлось. Попробуйте другое название.</div>}
      </div>
    </>
  );
}
