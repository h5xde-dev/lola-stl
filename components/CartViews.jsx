"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BadgePercent, Download, Gift, Info, Layers, Link as LinkIcon, Lock, ReceiptText, ShoppingBag, Sparkles, X } from "lucide-react";
import ModelArt from "./ModelArt";
import ProductCard from "./ProductCard";
import { api, useServerQuote, useStore } from "./Store";
import { fmtDate, fmtDay, models, rub, zipMb } from "@/lib/format";
import { modelHref } from "@/lib/models";
import { PAY_METHODS } from "@/lib/payments";

// Поле промокода. Код хранится в состоянии; применять или нет, решает расчёт цены.
function PromoField() {
  const { s, set } = useStore();
  const Q = useServerQuote();
  const [val, setVal] = useState(s.code || "");
  const applied = Q.discount?.kind === "code";
  const apply = e => { e.preventDefault(); set({ code: val.trim().toUpperCase() }); };
  return (
    <form className="promo-field" onSubmit={apply}>
      <label htmlFor="promoCode" className="sr-only">Промокод</label>
      <input id="promoCode" type="text" placeholder="Промокод" value={val} autoComplete="off" spellCheck="false"
        onChange={e => setVal(e.target.value)} aria-invalid={!!Q.codeNote && !applied} />
      {s.code
        ? <button type="button" className="mini-btn" onClick={() => { setVal(""); set({ code: "" }); }}>Убрать</button>
        : <button type="submit" className="mini-btn" disabled={!val.trim()}>Применить</button>}
      {s.code && (applied
        ? <span className="promo-ok">Промокод {Q.discount.code} применён</span>
        : Q.codeNote && <span className="err">{Q.codeNote}</span>)}
    </form>
  );
}

function Summary({ title = "Ваш заказ", withBtn, withCode }) {
  const { s, promo } = useStore();
  const Q = useServerQuote();
  const pq = Q.pq;
  return (
    <aside className="summary-card" aria-label="Итог">
      <h2>{title}</h2>
      <div className={"promo-now" + (promo ? " on" : "")}>
        {promo ? <Gift size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
        <span>{promo ? `Действует «1+1» до ${fmtDay(s.promoEnd)}` : "Действует «2+1»"}. Боксы считаются отдельно.</span>
      </div>
      {Q.bundles.map(x => (
        <div key={x.id}>
          <div className="summary-row"><span>Набор «{x.b.name}» · {x.items.length}</span><b>{rub(x.price)}</b></div>
          {x.price < +x.b.price && <div className="summary-sub">часть моделей уже куплена — цена меньше</div>}
        </div>
      ))}
      {Q.plants.length > 0 && <>
        <div className="summary-row"><span>Модели · {Q.plants.length}</span><b>{rub(pq.price)}{pq.prov ? "*" : ""}</b></div>
        <div className="summary-sub">{pq.P} оплачиваемых <span className="gift-count">+ {pq.G} в подарок</span></div>
      </>}
      {Q.boxes.length > 0 && <>
        <div className="summary-row"><span>Боксы · {Q.boxes.length}</span><b>{rub(Q.bp)}</b></div>
        <div className="summary-sub">{promo ? "по " + rub(s.prices.boxPromo) + " по акции" : "без подарков"}</div>
      </>}
      {Q.discount && <div className="summary-row discount"><span><BadgePercent size={14} aria-hidden="true" /> {Q.discount.label}</span><b>−{rub(Q.discount.amount)}</b></div>}
      {pq.free > 0
        ? <div className="summary-hint"><span>Можно выбрать ещё <b>{models(pq.free)}</b> бесплатно.</span><Link href="/#catalog">Выбрать подарок →</Link></div>
        : Q.plants.length > 0 && <div className="summary-hint plain">Следующая модель: {Q.nextPlant ? "+" + rub(Q.nextPlant) : "бесплатно"}.</div>}
      {withCode && <PromoField />}
      <div className="summary-total"><span>К оплате</span><strong>{rub(Q.total)}</strong></div>
      {Q.save > 0 && <div className="summary-save">Выгода {rub(Q.save)} по сравнению с покупкой по одной</div>}
      {withBtn && <Link href="/checkout" className="button button-dark full site-only">Перейти к оплате <ArrowRight size={17} /></Link>}
      {pq.prov && <p className="price-warning">* Цена за {s.prices.prov.join(", ")} оплачиваемых моделей предварительная и будет уточнена.</p>}
      {withBtn && <small className="summary-footnote">Файлы для скачивания появятся сразу после оплаты.</small>}
    </aside>
  );
}

function Line({ id, tag, gift, inSet }) {
  const { byId, toggleCart } = useStore();
  const m = byId[id];
  return (
    <div className="cart-line">
      <Link href={modelHref(m)} className="cart-thumb" aria-label={`${m.name}: подробнее`}><ModelArt m={m} uid={"r-" + id} sizes="80px" /></Link>
      <Link href={modelHref(m)} className="cart-line-name"><b>{m.name}</b><span>STL · {m.mb} МБ<span className="zip"> · ZIP ≈ {zipMb(m)} МБ</span></span></Link>
      <span className={"line-tag" + (gift ? " gift" : "")}>{tag}</span>
      {inSet ? <span aria-hidden="true" /> : <button type="button" className="remove-button" aria-label={`Убрать «${m.name}»`} onClick={() => toggleCart(id)}><X size={17} /></button>}
    </div>
  );
}

export function CartView() {
  const { toggleCart } = useStore();
  const Q = useServerQuote();
  return (
    <div className="inner-page">
      <div className="page-title"><span className="eyebrow">Ваш выбор</span><h1>Корзина</h1><p>Проверьте, что войдёт в заказ. Подарки и скидки корзина считает сама.</p></div>
      {!Q.count ? (
        <div className="cart-empty">
          <div className="empty-bag"><ShoppingBag size={28} /></div>
          <h2>Пока здесь пусто</h2><p>Добавьте модели, которые хочется напечатать.</p>
          <Link href="/#catalog" className="button button-dark">В каталог <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            {Q.bundles.map(x => (
              <section key={x.id} className="cart-group" aria-label={`Набор «${x.b.name}»`}>
                <div className="cart-list-head"><span><Layers size={13} aria-hidden="true" /> НАБОР «{x.b.name.toUpperCase()}»</span>
                  <button type="button" className="x" onClick={() => toggleCart(x.id)}>Убрать набор</button></div>
                {x.items.map(id => <Line key={id} id={id} tag="в наборе" inSet />)}
              </section>
            ))}
            {Q.plants.length > 0 && <section className="cart-group" aria-label="Модели">
              <div className="cart-list-head"><span>МОДЕЛИ</span><span>{Q.pq.P} + {Q.pq.G}</span></div>
              {Q.plants.map((id, i) => <Line key={id} id={id} tag={i < Q.pq.P ? "оплачиваемая" : "подарок"} gift={i >= Q.pq.P} />)}
            </section>}
            {Q.boxes.length > 0 && <section className="cart-group" aria-label="Боксы">
              <div className="cart-list-head"><span>БОКСЫ</span><span>{Q.boxes.length}</span></div>
              {Q.boxes.map(id => <Line key={id} id={id} tag="бокс" />)}
            </section>}
            <Link href="/#catalog" className="continue-link"><ArrowLeft size={15} /> Продолжить покупки</Link>
          </div>
          <Summary withBtn withCode />
        </div>
      )}
    </div>
  );
}

export function CheckoutView() {
  const { s, set, me } = useStore();
  const Q = useServerQuote();
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const tg = s.mode === "tg";
  // Способы оплаты из админки; тестовая «только для меня» видна, когда открыта админка в этом браузере
  const ids = [...(s.payMethods || []), ...(me?.admin && s.payTestAdmin && !(s.payMethods || []).includes("test") ? ["test"] : [])];
  const methods = PAY_METHODS.filter(m => ids.includes(m.id));
  const free = Q.total === 0;
  if (!Q.count) return <CartView />;

  // Сервер заново считает сумму, создаёт заказ и платёж в ЮKassa и возвращает адрес страницы оплаты.
  const submit = async e => {
    e.preventDefault();
    const f = e.currentTarget, email = f.email.value.trim(), err = {};
    set({ email });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err.email = "Введите email в формате name@mail.ru: на него придёт чек.";
    if (!f.agree.checked) err.agree = "Отметьте согласие с офертой, чтобы перейти к оплате.";
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    const { ok, data } = await api("/api/checkout", { method: "POST", body: JSON.stringify({ cart: s.cart, code: s.code, email, agree: true, channel: tg ? "tg" : "site", method: f.pm?.value || (free ? "" : methods[0]?.id) }) });
    if (!ok) { setBusy(false); setErrors({ form: data.error || "Не получилось создать заказ. Попробуйте ещё раз." }); return; }
    location.href = data.url;
  };

  return (
    <div className="inner-page">
      <nav className="breadcrumbs" aria-label="Навигация"><Link href="/cart">Корзина</Link><span aria-hidden="true">/</span><span aria-current="page">Оформление заказа</span></nav>
      <div className="page-title"><span className="eyebrow">Последний шаг</span><h1>Оформление заказа</h1><p>Укажите почту — отправим чек и ссылку на файлы.</p></div>
      <div className="checkout-layout">
        <form className="checkout-form" id="coForm" noValidate onSubmit={submit}>
          <h2>Контактные данные</h2>
          <div className="id-note"><Info size={16} aria-hidden="true" />{tg ? "Покупки привязаны к вашему Telegram-аккаунту. Email нужен только для чека." : "Без регистрации: покупки привязываются к email, туда же придут чек и ссылка на заказ."}</div>
          <label className="form-label">Email для чека{tg ? "" : " и ссылки"}
            <input type="email" name="email" autoComplete="email" placeholder="name@mail.ru" defaultValue={s.email} aria-invalid={!!errors.email} />
            {errors.email && <span className="err">{errors.email}</span>}
          </label>
          <h2 className="payment-title">Способ оплаты</h2>
          {free ? <p className="terms-note">Заказ бесплатный — оплата не нужна.</p>
            : methods.length ? <div className="pay-opts" role="radiogroup" aria-label="Способ оплаты">
              {methods.map((m, i) => (
                <label key={m.id} className={"payment-option" + (m.test ? " test" : "")}><input type="radio" name="pm" value={m.id} defaultChecked={!i} />
                  <span className="payment-icon">{m.icon}</span><span><b>{m.name}</b><small>{m.note}</small></span><span className="radio-dot" /></label>
              ))}
            </div>
            : <div className="order-alert"><Info size={16} aria-hidden="true" /><span>Оплата пока не подключена — магазин скоро откроется. Модели можно добавить в избранное.</span></div>}
          <label className="check-row"><input type="checkbox" name="agree" /><span>Принимаю условия оферты и лицензии: файлы для личного использования и продажи отпечатков, передавать и публиковать файлы нельзя</span></label>
          {errors.agree && <span className="err">{errors.agree}</span>}
          {errors.form && <span className="err">{errors.form}</span>}
          <button type="submit" className="button button-dark full site-only" disabled={busy || (!free && !methods.length)}>{busy ? "Создаём заказ…" : <>Оплатить {rub(Q.total)} <ArrowRight size={17} /></>}</button>
          {!free && methods.some(m => !m.test) && <p className="terms-note">Оплата проходит на защищённой странице ЮKassa{tg ? ", после оплаты вы вернётесь сюда" : ""}.</p>}
        </form>
        <div>
          <Summary title="В заказе" withCode />
          <div className="digital-note"><Download size={17} aria-hidden="true" /><span>Файлы будут доступны сразу после оплаты в личном кабинете и по личной ссылке на заказ: каждую модель можно скачать до {s.downloadLimit || 5} раз по личной ссылке.</span></div>
        </div>
      </div>
    </div>
  );
}

// Возврат со страницы оплаты: ждём подтверждения от ЮKassa и открываем покупки.
export function ReturnView() {
  const { set, setFlash, loadMe } = useStore();
  const router = useRouter();
  const code = useSearchParams().get("order") || "";
  const [st, setSt] = useState("wait");
  useEffect(() => {
    let alive = true, tries = 0;
    const tick = async () => {
      const { ok, data } = await api(`/api/orders/${encodeURIComponent(code)}`);
      if (!alive) return;
      if (ok && ["paid", "review", "revoked"].includes(data.status)) {
        set({ cart: [], code: "" }); setFlash(code); await loadMe(); router.replace("/account"); return;
      }
      if (ok && data.status === "canceled") { setSt("canceled"); return; }
      if (!ok) { setSt("missing"); return; }
      if (++tries > 60) { setSt("slow"); return; }
      setTimeout(tick, 2000);
    };
    tick();
    return () => { alive = false; };
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="inner-page">
      <div className="page-title"><span className="eyebrow">Заказ {code}</span>
        <h1>{st === "canceled" ? "Оплата отменена" : st === "missing" ? "Заказ не найден" : "Проверяем оплату…"}</h1>
        <p>{st === "canceled" ? "Деньги не списаны. Корзина сохранилась — можно попробовать ещё раз."
          : st === "slow" ? "Подтверждение задерживается. Ссылка на файлы придёт на email сразу после оплаты — эту страницу можно закрыть."
          : st === "missing" ? "Откройте заказ по ссылке из письма."
          : "Обычно это занимает несколько секунд. Не закрывайте страницу."}</p></div>
      {st === "wait" && <div className="skeleton" aria-busy="true"><span className="spinner" /></div>}
      {st !== "wait" && <div className="actions"><Link href="/cart" className="button button-dark">В корзину</Link><Link href="/account" className="button button-outline">Личный кабинет</Link></div>}
    </div>
  );
}

const STATUS = {
  review: "Скачивание приостановлено: по заказу заметили необычную активность. Напишите нам — разберёмся и откроем доступ.",
  revoked: "Доступ к файлам этого заказа закрыт. Если это ошибка, напишите нам.",
};

function LinkRequest() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const send = async e => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return;
    await api("/api/auth/request", { method: "POST", body: JSON.stringify({ email: email.trim() }) });
    setSent(true);
  };
  return sent
    ? <div className="empty-state" style={{ marginTop: 26 }}>Если на {email} были покупки, ссылка для входа уже в почте. Она действует 3 дня.</div>
    : <form className="link-request" onSubmit={send}>
        <b>Войти в личный кабинет</b>
        <p>Пришлём ссылку для входа на email, который вы указывали при оплате. В Telegram кабинет открывается сам.</p>
        <div className="promo-field" style={{ margin: 0 }}>
          <label htmlFor="lrEmail" className="sr-only">Email</label>
          <input id="lrEmail" type="email" placeholder="name@mail.ru" value={email} onChange={e => setEmail(e.target.value)} style={{ textTransform: "none", fontFamily: "var(--f-body)", letterSpacing: 0 }} />
          <button type="submit" className="mini-btn">Прислать ссылку</button>
        </div>
      </form>;
}

// Скачивание: сервер проверяет покупателя, лимит и места скачивания, пишет журнал и выдаёт ссылку на 5 минут.
function useDownload(after) {
  const { s, toast } = useStore();
  const [busy, setBusy] = useState("");
  const limit = s.downloadLimit || 5;
  const download = async (o, id) => {
    setBusy(o.id + id);
    const { ok, data } = await api("/api/download", { method: "POST", body: JSON.stringify({ order: o.id, model: id }) });
    setBusy("");
    if (!ok) { toast(data.error || "Не получилось скачать. Попробуйте ещё раз."); after?.(); return; }
    location.href = data.url;
    toast(`Скачивание началось. Осталось ${data.left} из ${limit}.`);
    setTimeout(() => after?.(), 800);
  };
  return { busy, download, limit };
}

// Блок заказа: модели со скачиванием, постоянная ссылка на заказ и чек
function OrderBlock({ o, dl, showLink = true }) {
  const { byId, toast, flash } = useStore();
  const { busy, download, limit } = dl;
  const blocked = o.status && o.status !== "paid";
  const ids = o.items.filter(id => byId[id]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(location.origin + o.link); toast("Ссылка на заказ скопирована"); }
    catch { toast("Не получилось скопировать — откройте заказ и скопируйте адрес из строки браузера"); }
  };
  return (
    <section className={"order-block" + (flash === o.id ? " flash" : "") + (blocked ? " blocked" : "")} aria-label={`Заказ ${o.id}`}>
      <div className="order-head">
        <div><b>Заказ {o.id}</b><span>{fmtDate(o.date)} · {models(o.items.length)} · {rub(o.total)}{o.method ? " · " + o.method : ""}{o.discount ? ` · ${o.discount.label}` : ""}</span></div>
        {o.link && <div className="order-tools">
          <Link href={o.link + "/receipt"} className="mini-btn"><ReceiptText size={14} aria-hidden="true" /> Чек</Link>
          {showLink && <button type="button" className="mini-btn" onClick={copy}><LinkIcon size={14} aria-hidden="true" /> Ссылка на заказ</button>}
        </div>}
      </div>
      {blocked && <div className="order-alert"><Lock size={16} aria-hidden="true" /><span>{STATUS[o.status] || STATUS.revoked}</span></div>}
      {ids.map(id => {
        const m = byId[id], used = (o.downloads || {})[id] || 0, left = Math.max(0, limit - used);
        return (
          <div className="library-item" key={id}>
            <Link href={modelHref(m)} className="library-thumb" aria-label={`${m.name}: подробнее`}><ModelArt m={m} uid={"o-" + o.id + id} sizes="64px" /></Link>
            <div><b>{m.name}</b><span>{m.slug}_{o.id} · {zipMb(m)} МБ · <span className={left ? "" : "err"}>осталось {left} из {limit}</span></span></div>
            <button type="button" className="download-button" disabled={blocked || !left || busy === o.id + id} aria-label={`Скачать «${m.name}»`} onClick={() => download(o, id)}>
              <Download size={16} /><span>{busy === o.id + id ? "Готовим…" : left ? "Скачать" : "Лимит исчерпан"}</span></button>
          </div>
        );
      })}
      <div className="order-foot"><span>Ссылка на заказ постоянная и личная — не пересылайте её. Передавать файлы третьим лицам запрещено лицензией.</span>{o.email && <span>Чек отправлен на {o.email}</span>}</div>
    </section>
  );
}

// Заказ по постоянной личной ссылке из письма или от бота
export function OrderLinkView({ token }) {
  const { loadMe } = useStore();
  const [st, setSt] = useState({ state: "load" });
  const load = useCallback(async () => {
    const { ok, data } = await api(`/api/o/${encodeURIComponent(token)}`);
    if (!ok) setSt({ state: "missing", error: data.error });
    else if (data.pending) setSt({ state: "pending", url: data.url });
    else { setSt({ state: "ok", order: data.order }); loadMe(); }
  }, [token, loadMe]);
  useEffect(() => { load(); }, [load]);
  const dl = useDownload(load);
  return (
    <div className="inner-page">
      <div className="page-title"><span className="eyebrow">Ваш заказ</span><h1>{st.order ? `Заказ ${st.order.id}` : "Заказ"}</h1>
        <p>Эта страница всегда открывается по ссылке из письма. Все заказы — в <Link href="/account">личном кабинете</Link>.</p></div>
      {st.state === "load" && <div className="skeleton" aria-busy="true">Открываем заказ…</div>}
      {st.state === "missing" && <div className="empty-state">{st.error || "Заказ не найден."} <Link href="/account">Личный кабинет</Link></div>}
      {st.state === "pending" && <div className="empty-state">Заказ ещё не оплачен. {st.url && <a href={st.url}>Перейти к оплате</a>}</div>}
      {st.order && <OrderBlock o={st.order} dl={dl} showLink={false} />}
    </div>
  );
}

export function AccountView() {
  const { s, byId, toast, me, loadMe } = useStore();
  const [tab, setTab] = useState("orders");
  const params = useSearchParams();
  const tg = s.mode === "tg";
  const orders = (s.orders || []).filter(o => o.own).sort((a, b) => b.date - a.date);
  const favs = (s.favs || []).map(id => byId[id]).filter(m => m && !m.deleted && !m.hidden);
  const dl = useDownload(loadMe);
  useEffect(() => {
    if (params.get("link") === "expired") toast("Ссылка для входа устарела. Запросите новую ниже.");
    if (params.get("welcome")) toast("Готово: вы вошли в личный кабинет на этом устройстве.");
  }, [params, toast]);
  const who = me?.customer;
  const spent = orders.filter(o => o.status === "paid").reduce((a, o) => a + o.total, 0);
  const count = orders.reduce((a, o) => a + o.items.length, 0);

  return (
    <div className="inner-page">
      <div className="page-title"><span className="eyebrow">Ваша коллекция</span><h1>Личный кабинет</h1><p>Купленные модели, ссылки на заказы и чеки.</p></div>
      <div className="account-banner">
        <div className="account-avatar" aria-hidden="true">{(who?.email || who?.tg || "L").replace(/^@/, "")[0].toUpperCase()}</div>
        <div><b>{who ? (who.email || (who.tg ? "Telegram: " + who.tg : "Ваш кабинет")) : tg ? "Мини-приложение" : "Гость"}</b>
          <p>{who ? `Заказов: ${orders.length} · моделей: ${count}${spent ? " · на " + rub(spent) : ""}`
            : orders.length ? "Заказы, открытые на этом устройстве по ссылкам из писем. Войдите, чтобы видеть все." : "Войдите по ссылке из письма или через Telegram."}</p></div>
        {who ? <button type="button" className="text-link" style={{ border: 0, background: "none", cursor: "pointer" }} onClick={async () => { await api("/api/auth/logout", { method: "POST" }); location.reload(); }}>Выйти</button>
          : <Link href="/#catalog" className="text-link">В каталог <ArrowRight size={16} /></Link>}
      </div>
      <div className="account-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "orders"} onClick={() => setTab("orders")}>Заказы и чеки<small>{orders.length}</small></button>
        <button type="button" role="tab" aria-selected={tab === "favs"} onClick={() => setTab("favs")}>Избранное<small>{favs.length}</small></button>
      </div>

      {tab === "favs" ? (
        favs.length ? <div className="product-grid fav-grid">{favs.map(m => <ProductCard key={m.id} m={m} />)}</div>
          : <div className="empty-state" style={{ marginTop: 26 }}>Отмечайте понравившиеся модели сердцем — они появятся здесь.</div>
      ) : <>
        {orders.map(o => <OrderBlock key={o.id} o={o} dl={dl} />)}
        {!orders.length && me && <div className="empty-state" style={{ marginTop: 26 }}>Заказов пока нет. <Link href="/#catalog">Перейти в каталог</Link></div>}
        {me && !who && <LinkRequest />}
      </>}
    </div>
  );
}
