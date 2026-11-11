"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Menu, ShoppingBag, Sparkles, X } from "lucide-react";
import { useServerQuote, useStore } from "./Store";
import Effects from "./Effects";
import { fmtDay, models, rub } from "@/lib/format";
import { categoryHref } from "@/lib/models";


export function Brand({ sub = "STL-МОДЕЛИ ДЛЯ ПЕЧАТИ", href = "/" }) {
  return (
    <Link href={href} className="brand" aria-label="lola.stl — на главную">
      <span className="brand-mark" aria-hidden="true">L</span>
      <span>lola<span className="brand-dot">.stl</span>{sub && <small>{sub}</small>}</span>
    </Link>
  );
}

function ProtoBar({ demo }) {
  const { s, set, reset } = useStore();
  if (!demo) return null;
  return (
    <div className="proto">
      <div className="wrap proto-in">
        <span className="proto-label">Прототип</span>
        <div className="seg" role="group" aria-label="Вид магазина">
          {[["site", "Сайт"], ["tg", "Telegram Mini App"]].map(([k, t]) => (
            <button key={k} type="button" aria-pressed={s.mode === k} onClick={() => set({ mode: k })}>{t}</button>
          ))}
        </div>
        <Link href="/admin" className="link-btn" style={{ color: "var(--ink)", fontWeight: 700 }}>Открыть админку</Link>
        <button type="button" className="link-btn" onClick={reset}>Очистить корзину</button>
        <span className="proto-note">Акцию «1+1» включают в админке. Без ключей ЮKassa оплата тестовая.</span>
      </div>
    </div>
  );
}

function Announcement() {
  const { s, promo } = useStore();
  return promo
    ? <div className="announcement promo"><Sparkles size={14} aria-hidden="true" /> Акция «1+1»: к каждой оплаченной модели одна в подарок <span className="dim">—</span> <span className="tail">до {fmtDay(s.promoEnd)}</span></div>
    : <div className="announcement"><Sparkles size={14} aria-hidden="true" /> Модели для тех, кто любит создавать <span className="dim">—</span> <span className="tail">файлы сразу после оплаты</span></div>;
}


function Header() {
  const { s, set, cats } = useStore();
  const Q = useServerQuote();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const home = path === "/";
  const menu = cats.filter(c => c.inMenu && s.models.some(m => m.category === c.id && !m.hidden && !m.deleted));
  return (
    <header className="site-header site-only">
      <div className="wrap header-in">
        <button type="button" className="icon-btn mobile-menu" aria-label={open ? "Закрыть меню" : "Открыть меню"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
        <Brand />
        <nav className={open ? "main-nav nav-open" : "main-nav"} aria-label="Основная навигация">
          <Link href="/#catalog" aria-current={home && s.filter === "all" ? "page" : undefined} onClick={() => { set({ filter: "all", q: "" }); setOpen(false); }}>Каталог</Link>
          {menu.map(c => (
            <Link key={c.id} href={categoryHref(c)} aria-current={path === `/category/${c.slug}` ? "page" : undefined} onClick={() => setOpen(false)}>{c.name}</Link>
          ))}
          <Link href="/#catalog" aria-current={home && s.filter === "new" ? "page" : undefined} onClick={() => { set({ filter: "new", q: "" }); setOpen(false); }}>Новинки</Link>
        </nav>
        <div className="header-actions">
          <Link href="/purchases" className="header-link" aria-current={path === "/purchases" ? "page" : undefined}>Мои покупки</Link>
          <Link href="/cart" className="bag-link" aria-label={`Корзина: ${models(Q.count)}${Q.count ? ", " + rub(Q.total) : ""}`}>
            <ShoppingBag size={19} aria-hidden="true" /><span>Корзина</span><b className={Q.count ? "on" : ""}>{Q.count}</b>
            {Q.count > 0 && <span className="sum">{rub(Q.total)}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}

function TgMainButton() {
  const Q = useServerQuote();
  const path = usePathname(), router = useRouter();
  let label = null, go = null;
  if (!Q.count) return null;
  if (path === "/" || path.startsWith("/models/")) { label = `Корзина · ${models(Q.count)} · ${rub(Q.total)}`; go = () => router.push("/cart"); }
  else if (path === "/cart") { label = `Оформить · ${rub(Q.total)}`; go = () => router.push("/checkout"); }
  else if (path === "/checkout") { label = `Оплатить ${rub(Q.total)}`; go = () => document.getElementById("coForm")?.requestSubmit(); }
  if (!label) return null;
  return <div className="tg-main tg-only"><button type="button" className="button button-dark full" onClick={go}>{label}</button></div>;
}

export default function Shell({ children, demo = true }) {
  const { s, toast, toastMsg } = useStore();
  const path = usePathname(), router = useRouter();
  const adm = path.startsWith("/admin");
  const cls = [s.mode === "tg" && !adm ? "tg" : "", adm ? "is-admin" : ""].join(" ").trim();

  return (
    <div className={cls}>
      {!adm && <Effects />}
      <ProtoBar demo={demo} />
      <div className="stage">
        <div className="shell">
          {!adm && <div className="site-only"><Announcement /></div>}
          <Header />
          <div className="tg-head tg-only">
            {path === "/"
              ? <button type="button" className="tg-x" onClick={() => toast("В Telegram эта кнопка закрывает мини-приложение.")}>Закрыть</button>
              : <button type="button" className="tg-x tg-back" onClick={() => (history.length > 1 ? router.back() : router.push("/"))}><ChevronLeft size={18} aria-hidden="true" />Назад</button>}
            <div className="tg-title"><b>lola.stl</b><small>мини-приложение</small></div>
            <Link href="/purchases" className="tg-x">Покупки</Link>
          </div>
          <main>{children}</main>
          <footer className="site-footer site-only">
            <div className="wrap footer-in">
              <Brand sub="" />
              <p>Файлы, которые превращаются в вещи.</p>
              <div className="footer-links"><Link href="/">Каталог</Link><Link href="/purchases">Мои покупки</Link><Link href="/admin">Админ-панель</Link></div>
              <small>© 2026 lola.stl · ИП [ФИО] · ИНН [—] · Оферта и лицензия · Политика обработки данных</small>
            </div>
          </footer>
          {!adm && <TgMainButton />}
        </div>
      </div>
      <div className={"toast" + (toastMsg.on ? " on" : "")} role="status" aria-live="polite">{toastMsg.text}</div>
    </div>
  );
}
