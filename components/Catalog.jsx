"use client";
import { Search } from "lucide-react";
import ProductCard from "./ProductCard";
import Tiers from "./Tiers";
import { useStore } from "./Store";
import { models } from "@/lib/format";

const CHIPS = [["all", "Все модели"], ["plant", "Кашпо"], ["box", "Боксы"], ["new", "Новинки"]];

export default function Catalog() {
  const { s, set } = useStore();
  const pub = s.models.filter(m => !m.hidden && !m.deleted);
  const q = s.q.trim().toLowerCase();
  const list = pub.filter(m => (s.filter === "all" || (s.filter === "new" ? m.isNew : m.cat === s.filter)) && (!q || m.name.toLowerCase().includes(q)));
  return (
    <>
      <Tiers />
      <div className="catalog-toolbar">
        <div className="category-tabs" role="group" aria-label="Категории моделей">
          {CHIPS.map(([k, t]) => <button key={k} type="button" className="category-tab" aria-pressed={s.filter === k} onClick={() => set({ filter: k })}>{t}</button>)}
        </div>
        <label className="search-field"><Search size={16} aria-hidden="true" />
          <input type="search" value={s.q} onChange={e => set({ q: e.target.value })} placeholder="Найти модель" aria-label="Найти модель" />
        </label>
      </div>
      <div className="product-grid">
        {list.length ? list.map(m => <ProductCard key={m.id} m={m} />)
          : <div className="empty-state">Не нашли модель. Попробуйте другое название.</div>}
      </div>
      <div className="catalog-bottom">
        <span>Показано {models(list.length)} из {pub.length}</span>
        <span>В магазине будет весь каталог — около 130 моделей</span>
      </div>
    </>
  );
}
