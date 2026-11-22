"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import ProductCard, { BundleCard } from "./ProductCard";
import Tiers from "./Tiers";
import { useStore } from "./Store";
import { models } from "@/lib/format";


// Сколько карточек показывать сразу и добавлять по кнопке «Показать ещё».
// Все 130+ карточек сразу — тысячи элементов и долгая отрисовка на телефоне.
const PAGE = 24;
// Возврат «Назад» со страницы модели: каталог открывается с тем же числом карточек и на той же прокрутке.
const RETURN_KEY = "lola-catalog-return";
let lastPop = 0;
if (typeof window !== "undefined") addEventListener("popstate", () => { lastPop = Date.now(); });

// category — id категории на её странице: тогда фильтры по категориям не нужны.
export default function Catalog({ category }) {
  const { s, set, cats } = useStore();
  const all = s.models.filter(m => !m.hidden && !m.deleted);
  const pub = category ? all.filter(m => m.category === category) : all;
  const used = cats.filter(c => all.some(m => m.category === c.id));
  const chips = [["all", "Все модели"], ...used.map(c => [c.id, c.name]), ["new", "Новинки"], ...(all.some(m => m.free) ? [["free", "Бесплатные"]] : [])];
  const filter = category || chips.some(([k]) => k === s.filter) ? s.filter : "all";
  const q = s.q.trim().toLowerCase();
  const match = m => (category || filter === "all" || (filter === "new" ? m.isNew : filter === "free" ? m.free : m.category === filter)) &&
    (!q || m.name.toLowerCase().includes(q) || (m.tags || []).some(t => t.includes(q)));
  const list = pub.filter(match);
  const [limit, setLimit] = useState(PAGE);
  const path = usePathname();
  const restoreY = useRef(null), first = useRef(true);
  // Новый фильтр или поиск — снова с первой порции (но не при первом показе: там может быть возврат)
  useEffect(() => { if (first.current) { first.current = false; return; } setLimit(PAGE); }, [filter, q, category]);
  // Вернулись кнопкой «Назад»: восстанавливаем число карточек до отрисовки, затем прокрутку
  useLayoutEffect(() => {
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) || "null"); sessionStorage.removeItem(RETURN_KEY); } catch {}
    if (!saved || saved.path !== path || saved.filter !== filter || saved.q !== q || Date.now() - lastPop > 3000) return;
    setLimit(Math.max(PAGE, saved.limit || PAGE));
    restoreY.current = saved.y;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (restoreY.current == null) return;
    const y = restoreY.current; restoreY.current = null;
    // Две попытки: после отрисовки карточек и после того, как Next.js закончит свою прокрутку
    requestAnimationFrame(() => scrollTo(0, y));
    setTimeout(() => scrollTo(0, y), 120);
  }, [limit]);
  // Уходим в карточку модели — запоминаем, где были
  const remember = e => {
    if (!e.target.closest?.("a[href^='/models/']")) return;
    try { sessionStorage.setItem(RETURN_KEY, JSON.stringify({ path, filter, q, limit, y: scrollY })); } catch {}
  };
  const shown = list.slice(0, limit), rest = list.length - shown.length;
  const sets = (s.bundles || []).filter(b => b.active && !b.deleted && b.items.some(id => all.some(m => m.id === id)));
  // ?q=… в адресе — поиск из строки поиска Google и Яндекса прямо в выдаче.
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("q");
    if (q) { set({ q, filter: "all" }); document.getElementById("catalog")?.scrollIntoView(); }
  }, [set]);
  return (
    <>
      <Tiers />
      <div className="catalog-toolbar">
        {!category && <div className="category-tabs" role="group" aria-label="Категории моделей">
          {chips.map(([k, t]) => <button key={k} type="button" className="category-tab" aria-pressed={filter === k} onClick={() => set({ filter: k })}>{t}</button>)}
        </div>}
        <label className="search-field"><Search size={16} aria-hidden="true" />
          <input type="search" value={s.q} onChange={e => set({ q: e.target.value })} placeholder="Найти модель" aria-label="Найти модель" />
        </label>
      </div>
      {!category && filter === "all" && !q && sets.length > 0 && s.sections?.bundles !== false && (
        <div className="bundle-row" aria-label="Наборы">{sets.map(b => <BundleCard key={b.id} b={b} />)}</div>
      )}
      <div className="product-grid" onClickCapture={remember}>
        {list.length ? shown.map(m => <ProductCard key={m.id} m={m} />)
          : <div className="empty-state">Не нашли модель. Попробуйте другое название.</div>}
      </div>
      <div className="catalog-bottom">
        {rest > 0 && <button type="button" className="button button-outline" onClick={() => setLimit(n => n + PAGE)}>Показать ещё {Math.min(PAGE, rest)}</button>}
        <span>Показано {models(shown.length)} из {list.length === pub.length ? pub.length : `${list.length} найденных`}</span>
        <span>Каталог пополняется: новые модели появляются каждую неделю</span>
      </div>
    </>
  );
}
