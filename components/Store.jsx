"use client";
// Состояние прототипа: корзина, цены, акция, модели и заказы.
// На сервере и при первой отрисовке в браузере берутся исходные данные, поэтому HTML совпадает.
// После загрузки страницы подмешиваются правки из localStorage (их делает админка прототипа).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BASE_MODELS } from "@/lib/models";
import { DEFAULT_PRICES, promoOn, quote } from "@/lib/pricing";
import { rub } from "@/lib/format";

const KEY = "lola-next-v1";
const DAY = 864e5;

function seed() {
  const now = Date.now();
  return {
    cart: ["m01", "m03", "m07"], promo: false, promoAuto: false, promoStart: "2026-11-20", promoEnd: "2026-11-30",
    mode: "site", filter: "all", q: "", email: "", favs: [],
    models: JSON.parse(JSON.stringify(BASE_MODELS)),
    prices: JSON.parse(JSON.stringify(DEFAULT_PRICES)),
    orders: [
      { id: "L-1037", date: now - 12 * DAY, items: ["m01", "m11", "m04"], total: 1200, email: "buyer1@example.ru", method: "СБП", ch: "site", sample: true },
      { id: "L-1038", date: now - 9 * DAY, items: ["m02", "m06", "m08", "m12", "m13", "m14"], total: 2000, email: "buyer2@example.ru", tg: "@buyer_tg2", method: "Карта", ch: "tg", sample: true },
      { id: "L-1039", date: now - 7 * DAY, items: ["b02"], total: 900, email: "buyer3@example.ru", method: "СБП", ch: "site", sample: true },
      { id: "L-1040", date: now - 5 * DAY, items: ["m07", "m10", "b01", "b04"], total: 2800, email: "buyer4@example.ru", tg: "@buyer_tg4", method: "СБП", ch: "tg", sample: true },
      { id: "L-1041", date: now - 4 * DAY, items: ["m11"], total: 700, email: "buyer5@example.ru", tg: "@buyer_tg5", method: "Карта", ch: "tg", sample: true },
      { id: "L-1042", date: now - 3 * DAY, items: ["m05", "m09", "m02"], total: 1200, email: "buyer@example.ru", method: "СБП", ch: "site", sample: true, own: true },
    ],
  };
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
      if (saved && Array.isArray(saved.cart) && Array.isArray(saved.models)) setS(p => ({ ...p, ...saved }));
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
  const Q = useMemo(() => quote(s, byId), [s, byId]);
  const promo = promoOn(s);

  const toggleCart = useCallback(id => {
    const m = byId[id];
    if (!m) return;
    if (s.cart.includes(id)) { set(p => ({ cart: p.cart.filter(x => x !== id) })); return; }
    const next = quote({ ...s, cart: [...s.cart, id] }, byId);
    set(p => ({ cart: [...p.cart, id] }));
    toast(m.cat === "plant" && Q.pq.free > 0 ? `«${m.name}» добавлена в подарок` : `«${m.name}» в корзине · ${rub(next.total)}`);
  }, [byId, s, Q, set, toast]);

  const toggleFav = useCallback(id => {
    const on = !(s.favs || []).includes(id);
    set(p => ({ favs: on ? [...(p.favs || []), id] : (p.favs || []).filter(x => x !== id) }));
    if (on && byId[id]) toast(`«${byId[id].name}» в избранном`);
  }, [s.favs, byId, set, toast]);

  const reset = useCallback(() => { setS(seed()); setFlash(null); toast("Демо сброшено"); }, [toast]);

  const value = { s, set, ready, byId, Q, promo, toggleCart, toggleFav, toast, reset, flash, setFlash, toastMsg };
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
