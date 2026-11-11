"use client";
// Состояние прототипа: корзина, цены, акция, категории, модели и заказы.
// На сервере и при первой отрисовке в браузере берутся исходные данные, поэтому HTML совпадает.
// После загрузки страницы подмешиваются правки из localStorage (их делает админка прототипа).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BASE_CATEGORIES, BASE_MODELS } from "@/lib/models";
import { DEFAULT_PRICES, isSet, ownedIds, promoOn, quote } from "@/lib/pricing";
import { rub } from "@/lib/format";

// Версия ключа меняется, когда меняется формат данных: старые сохранённые данные сбрасываются.
const KEY = "lola-next-v4";
const clone = v => JSON.parse(JSON.stringify(v));

function seed() {
  return {
    cart: [], promo: false, promoAuto: false, promoStart: "2026-11-20", promoEnd: "2026-11-30",
    mode: "site", filter: "all", q: "", email: "", favs: [],
    categories: clone(BASE_CATEGORIES),
    models: clone(BASE_MODELS),
    prices: clone(DEFAULT_PRICES),
    orders: [],
    // Скидки. Пример кода и набора — их можно изменить или удалить в админке.
    code: "",
    promoCodes: [
      { id: "pc-lola10", code: "LOLA10", type: "percent", value: 10, active: true, from: "", to: "", maxUses: 0, once: true, minTotal: 0, category: "", firstOnly: true, duringPromo: false, note: "Для подписчиков канала, первый заказ" },
    ],
    bundles: [
      { id: "kashpo-all", name: "Все кашпо", desc: "Пять кашпо из каталога одним набором.", items: ["p01", "p02", "p03", "p04", "p05"], price: 1800, active: true },
    ],
    loyalty: { on: true, percent: 10 },
    downloadLimit: 5,
  };
}

// Добавляет к сохранённым правкам то, что появилось в каталоге после сохранения.
function mergeNew(saved, base) {
  const ids = new Set((saved || []).map(x => x.id));
  return [...(saved || []), ...base.filter(x => !ids.has(x.id)).map(clone)];
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [s, setS] = useState(seed);
  const [ready, setReady] = useState(false);
  const [toastMsg, setToastMsg] = useState({ text: "", on: false });
  const [flash, setFlash] = useState(null);
  const tRef = useRef();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (saved && Array.isArray(saved.cart) && Array.isArray(saved.models)) {
        saved.models = mergeNew(saved.models, BASE_MODELS);
        saved.categories = mergeNew(saved.categories, BASE_CATEGORIES);
        setS(p => ({ ...p, ...saved }));
      }
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }, [s, ready]);

  const set = useCallback(patch => setS(p => ({ ...p, ...(typeof patch === "function" ? patch(p) : patch) })), []);
  const toast = useCallback(text => {
    setToastMsg({ text, on: true });
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToastMsg(t => ({ ...t, on: false })), 3200);
  }, []);

  const byId = useMemo(() => Object.fromEntries(s.models.map(m => [m.id, m])), [s.models]);
  const cats = useMemo(() => [...(s.categories || [])].filter(c => !c.deleted).sort((a, b) => (a.order || 0) - (b.order || 0)), [s.categories]);
  const Q = useMemo(() => quote(s, byId, { cats }), [s, byId, cats]);
  const owned = useMemo(() => ownedIds(s), [s]);
  const promo = promoOn(s);

  // Модель или набор (id с префиксом set:). Купленное второй раз не добавляется,
  // модели набора убираются из корзины по отдельности — они уже внутри набора.
  const toggleCart = useCallback(id => {
    if (s.cart.includes(id)) { set(p => ({ cart: p.cart.filter(x => x !== id) })); return; }
    if (isSet(id)) {
      const b = (s.bundles || []).find(x => "set:" + x.id === id && x.active && !x.deleted);
      if (!b) return;
      const cart = [...s.cart.filter(x => !b.items.includes(x)), id];
      set({ cart });
      toast(`Набор «${b.name}» в корзине · ${rub(quote({ ...s, cart }, byId, { cats }).total)}`);
      return;
    }
    const m = byId[id];
    if (!m) return;
    if (owned.has(id)) { toast(`«${m.name}» уже куплена — она в «Моих покупках»`); return; }
    const inSet = (s.bundles || []).find(b => s.cart.includes("set:" + b.id) && b.items.includes(id));
    if (inSet) { toast(`«${m.name}» уже входит в набор «${inSet.name}»`); return; }
    const next = quote({ ...s, cart: [...s.cart, id] }, byId, { cats });
    set(p => ({ cart: [...p.cart, id] }));
    toast(m.cat === "plant" && Q.pq.free > 0 ? `«${m.name}» добавлена в подарок` : `«${m.name}» в корзине · ${rub(next.total)}`);
  }, [byId, cats, s, Q, owned, set, toast]);

  const toggleFav = useCallback(id => {
    const on = !(s.favs || []).includes(id);
    set(p => ({ favs: on ? [...(p.favs || []), id] : (p.favs || []).filter(x => x !== id) }));
    if (on && byId[id]) toast(`«${byId[id].name}» в избранном`);
  }, [s.favs, byId, set, toast]);

  const reset = useCallback(() => { setS(seed()); setFlash(null); toast("Демо сброшено"); }, [toast]);

  const value = { s, set, ready, byId, cats, Q, owned, promo, toggleCart, toggleFav, toast, reset, flash, setFlash, toastMsg };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore вне StoreProvider");
  return v;
}

// Страницы с персональными данными (корзина, покупки, админка) показываются после загрузки,
// чтобы не мигать демо-данными.
export function WhenReady({ children }) {
  const { ready } = useStore();
  return ready ? children : <div className="inner-page"><div className="skeleton" aria-busy="true">Загрузка…</div></div>;
}
