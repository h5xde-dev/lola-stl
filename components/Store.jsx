"use client";
// Состояние магазина в браузере.
// Каталог, цены, наборы и акция приходят с сервера (из базы) при отрисовке страницы.
// В браузере хранятся только корзина, избранное, введённый промокод и вид (сайт / Telegram).
// Покупки загружаются с сервера; админка загружает данные целиком и сохраняет изменения через API.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { isSet, ownedIds, promoOn, quote } from "@/lib/pricing";
import { rub } from "@/lib/format";

const KEY = "lola-cart-v1";
const LOCAL = ["cart", "mode", "filter", "q", "email", "favs", "code"];
const CATALOG = ["categories", "models", "prices", "promo", "promoAuto", "promoStart", "promoEnd", "loyalty", "downloadLimit", "bundles", "promoCodes"];

function seed(initial) {
  return {
    cart: [], mode: "site", filter: "all", q: "", email: "", favs: [], code: "",
    categories: [], models: [], prices: null, promo: false, promoAuto: false, promoStart: "", promoEnd: "",
    loyalty: { on: false, percent: 0 }, downloadLimit: 5, bundles: [], promoCodes: [], orders: [],
    ...initial,
  };
}

const Ctx = createContext(null);

async function api(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) }, cache: "no-store" });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}
export { api };

export function StoreProvider({ initial, children }) {
  const [s, setS] = useState(() => seed(initial));
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState(null);           // { customer } после загрузки покупок
  const [admin, setAdmin] = useState(null);     // { services, pendingOrders } когда загружена админка
  const [toastMsg, setToastMsg] = useState({ text: "", on: false });
  const [flash, setFlash] = useState(null);
  const tRef = useRef();

  // Корзина и избранное — из браузера; покупки — с сервера
  const loadMe = useCallback(async () => {
    const { ok, data } = await api("/api/me");
    if (ok) { setS(p => ({ ...p, orders: data.orders })); setMe({ customer: data.customer }); }
    return data;
  }, []);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (saved) setS(p => ({ ...p, ...Object.fromEntries(LOCAL.filter(k => k in saved).map(k => [k, saved[k]])) }));
    } catch {}
    setReady(true);
    loadMe();
    // Вход из Telegram Mini App: Telegram передаёт подписанные данные в адресе страницы
    const tgData = new URLSearchParams(location.hash.slice(1)).get("tgWebAppData");
    if (tgData) api("/api/tg/auth", { method: "POST", body: JSON.stringify({ initData: tgData }) }).then(r => { if (r.ok) { setS(p => ({ ...p, mode: "tg" })); loadMe(); } });
  }, [loadMe]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(LOCAL.map(k => [k, s[k]])))); } catch {}
  }, [s, ready]);

  const set = useCallback(patch => setS(p => ({ ...p, ...(typeof patch === "function" ? patch(p) : patch) })), []);
  const toast = useCallback(text => {
    setToastMsg({ text, on: true });
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToastMsg(t => ({ ...t, on: false })), 3600);
  }, []);

  // Админка: загрузить всё из базы
  const loadAdmin = useCallback(async () => {
    const { ok, status, data } = await api("/api/admin/state");
    if (!ok) return status;
    setS(p => ({ ...p, ...Object.fromEntries(CATALOG.map(k => [k, data[k]])), orders: data.orders }));
    setAdmin({ services: data.services, pendingOrders: data.pendingOrders, loadedAt: Date.now() });
    return 200;
  }, []);

  const byId = useMemo(() => Object.fromEntries(s.models.map(m => [m.id, m])), [s.models]);
  const cats = useMemo(() => [...(s.categories || [])].filter(c => !c.deleted).sort((a, b) => (a.order || 0) - (b.order || 0)), [s.categories]);
  // Оценка цены в браузере (мгновенно). Итог в корзине и при оплате подтверждает сервер.
  const Q = useMemo(() => s.prices ? quote(s, byId, { cats }) : null, [s, byId, cats]);
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
    toast(m.cat === "plant" && Q?.pq.free > 0 ? `«${m.name}» добавлена в подарок` : `«${m.name}» в корзине · ${rub(next.total)}`);
  }, [byId, cats, s, Q, owned, set, toast]);

  const toggleFav = useCallback(id => {
    const on = !(s.favs || []).includes(id);
    set(p => ({ favs: on ? [...(p.favs || []), id] : (p.favs || []).filter(x => x !== id) }));
    if (on && byId[id]) toast(`«${byId[id].name}» в избранном`);
  }, [s.favs, byId, set, toast]);

  const reset = useCallback(() => { set({ cart: [], favs: [], code: "", filter: "all", q: "" }); setFlash(null); toast("Корзина и избранное очищены"); }, [set, toast]);

  const value = { s, set, ready, me, loadMe, admin, loadAdmin, byId, cats, Q, owned, promo, toggleCart, toggleFav, toast, reset, flash, setFlash, toastMsg };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore вне StoreProvider");
  return v;
}

// Итог корзины от сервера: промокоды, история покупателя, наборы. Пока ответа нет — оценка из браузера.
export function useServerQuote() {
  const { s, Q } = useStore();
  const [server, setServer] = useState(null);
  const key = JSON.stringify([s.cart, s.code, (s.orders || []).length]);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const { ok, data } = await api("/api/quote", { method: "POST", body: JSON.stringify({ cart: s.cart, code: s.code }) });
      if (alive && ok) setServer({ ...data, owned: new Set(data.owned), key });
    }, 150);
    return () => { alive = false; clearTimeout(t); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return server && server.key === key ? server : Q;
}

// Страницы с личными данными показываются после загрузки из браузера, чтобы не мигать пустыми.
export function WhenReady({ children }) {
  const { ready } = useStore();
  return ready ? children : <div className="inner-page"><div className="skeleton" aria-busy="true">Загрузка…</div></div>;
}
