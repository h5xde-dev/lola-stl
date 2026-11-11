"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "./Store";
import { models, rub } from "@/lib/format";

const DEMO = process.env.NEXT_PUBLIC_DEMO !== "off";

function ProtoBar() {
  const { s, set, promo, reset, toast } = useStore();
  if (!DEMO) return null;
  const onPromo = e => {
    set({ promoAuto: false, promo: e.target.checked });
    toast(e.target.checked ? "Акция «1+1» включена. Цены в корзине пересчитаны." : "Акция выключена. Снова действует «2+1».");
  };
  return (
    <div className="proto">
      <div className="wrap proto-in">
        <span className="proto-label">Прототип</span>
        <label className="switch"><input type="checkbox" checked={promo} onChange={onPromo} /><span className="track" />Акция «1+1»</label>
        <div className="seg" role="group" aria-label="Вид магазина">
          {[["site", "Сайт"], ["tg", "Telegram Mini App"]].map(([k, t]) => (
            <button key={k} type="button" aria-pressed={s.mode === k} onClick={() => set({ mode: k })}>{t}</button>
          ))}
        </div>
        <Link href="/admin" className="link-btn" style={{ color: "var(--ink)", fontWeight: 700 }}>Открыть админку</Link>
        <button type="button" className="link-btn" onClick={reset}>Сбросить демо</button>
        <span className="proto-note">Магазин и админка работают с одними данными: правки сразу видны в каталоге и корзине.</span>
      </div>
    </div>
  );
}

function TgMainButton() {
  const { Q } = useStore();
  const path = usePathname(), router = useRouter();
  let label = null, go = null;
  if (!Q.count) return null;
  if (path === "/" || path.startsWith("/models/")) { label = `Корзина · ${models(Q.count)} · ${rub(Q.total)}`; go = () => router.push("/cart"); }
  else if (path === "/cart") { label = `Оформить · ${rub(Q.total)}`; go = () => router.push("/checkout"); }
  else if (path === "/checkout") { label = `Оплатить ${rub(Q.total)}`; go = () => document.getElementById("coForm")?.requestSubmit(); }
  if (!label) return null;
  return <div className="tg-main tg-only"><button type="button" className="btn primary block" onClick={go}>{label}</button></div>;
}

export default function Shell({ children }) {
  const { s, Q, toast, toastMsg } = useStore();
  const path = usePathname();
  const adm = path.startsWith("/admin");
  const cls = [s.mode === "tg" && !adm ? "tg" : "", adm ? "is-admin" : ""].join(" ").trim();
  const cur = p => (p === "/" ? path === "/" || path.startsWith("/models/") : path === p) ? "page" : undefined;

  return (
    <div className={cls}>
      <ProtoBar />
      <div className="stage">
        <div className="shell">
          <header className="site-head site-only">
            <div className="wrap head-in">
              <Link href="/" className="logo" aria-label="lola.stl — на главную">lola<span>.stl</span></Link>
              <nav aria-label="Разделы">
                <Link href="/" aria-current={cur("/")}>Каталог</Link>
                <Link href="/purchases" aria-current={cur("/purchases")}>Мои покупки</Link>
              </nav>
              <Link href="/cart" className="cart-btn">
                Корзина <span className="count">{Q.count}</span>{Q.count ? <span className="num">{rub(Q.total)}</span> : null}
              </Link>
            </div>
          </header>
          <div className="tg-head tg-only">
            <button type="button" className="tg-x" onClick={() => toast("В Telegram эта кнопка закрывает мини-приложение.")}>Закрыть</button>
            <div className="tg-title"><b>lola.stl</b><small>мини-приложение</small></div>
            <Link href="/purchases" className="tg-x">Покупки</Link>
          </div>
          <main>{children}</main>
          <footer className="site-foot site-only">
            <div className="wrap foot-in">
              <span>lola.stl · авторские STL-модели для 3D-печати</span>
              <span>ИП [ФИО] · ИНН [—] · Оферта и лицензия · Политика обработки данных</span>
            </div>
          </footer>
          {!adm && <TgMainButton />}
        </div>
      </div>
      <div className={"toast" + (toastMsg.on ? " on" : "")} role="status" aria-live="polite">{toastMsg.text}</div>
    </div>
  );
}
