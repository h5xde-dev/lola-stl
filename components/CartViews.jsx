"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BadgePercent, Download, Gift, Info, Layers, Link as LinkIcon, Lock, ReceiptText, ShoppingBag, Sparkles, X } from "lucide-react";
import ModelArt from "./ModelArt";
import ProductCard from "./ProductCard";
import { api, useServerQuote, useStore } from "./Store";
import { fmtDate, fmtDay, models, plural, rub, zipMb } from "@/lib/format";
import { modelHref } from "@/lib/models";
import { PAY_METHODS } from "@/lib/payments";

// Настоящее мини-приложение Telegram (а не вид «как в Telegram» в браузере)
const tgApp = () => { const w = typeof window !== "undefined" && window.Telegram?.WebApp; return w?.initData ? w : null; };
// Страница банка в Telegram открывается во внешнем браузере: во встроенном не работает кнопка «Назад»
// (ею управляет наш сайт, а он уже закрыт) и не открываются приложения банков по СБП.
const openPay = url => { const w = tgApp(); if (!w) return false; try { w.openLink(new URL(url, location.href).href); return true; } catch { return false; } };

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
      {(Q.solo || []).length > 0 && <>
        <div className="summary-row"><span>Вне акций · {Q.solo.length}</span><b>{rub(Q.sp)}</b></div>
        <div className="summary-sub">по {rub(Q.nextPlantNoGift)} за модель, без подарков и скидок</div>
      </>}
      {Q.boxes.length > 0 && <>
        <div className="summary-row"><span>Боксы · {Q.boxes.length}</span><b>{rub(Q.bp)}</b></div>
        <div className="summary-sub">отдельная цена, без акций и скидок</div>
      </>}
      {(Q.free || []).length > 0 && <>
        <div className="summary-row"><span>Бесплатные · {Q.free.length}</span><b>0 ₽</b></div>
      </>}
      {Q.discount && <div className="summary-row discount"><span><BadgePercent size={14} aria-hidden="true" /> {Q.discount.label}</span><b>−{rub(Q.discount.amount)}</b></div>}
      {pq.free > 0
        ? <div className="summary-hint"><span>Можно выбрать ещё <b>{models(pq.free)}</b> бесплатно.</span><Link href="/#catalog">Выбрать подарок →</Link></div>
        : Q.plants.length > 0 && <div className="summary-hint plain">Следующая модель: {Q.nextPlant ? "+" + rub(Q.nextPlant) : "бесплатно"}.</div>}
      {withCode && <PromoField />}
      <div className="summary-total"><span>К оплате</span><strong>{rub(Q.total)}</strong></div>
      {Q.save > 0 && <div className="summary-save">Выгода {rub(Q.save)} по сравнению с покупкой по одной</div>}
      {withBtn && <Link href="/checkout" className="button button-dark full site-only">{Q.total === 0 ? "Получить файлы" : "Перейти к оплате"} <ArrowRight size={17} /></Link>}
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
            {(Q.solo || []).length > 0 && <section className="cart-group" aria-label="Модели вне акций">
              <div className="cart-list-head"><span>ВНЕ АКЦИЙ</span><span>{Q.solo.length}</span></div>
              {Q.solo.map(id => <Line key={id} id={id} tag="без подарков" />)}
            </section>}
            {Q.boxes.length > 0 && <section className="cart-group" aria-label="Боксы">
              <div className="cart-list-head"><span>БОКСЫ</span><span>{Q.boxes.length}</span></div>
              {Q.boxes.map(id => <Line key={id} id={id} tag="бокс" />)}
            </section>}
            {(Q.free || []).length > 0 && <section className="cart-group" aria-label="Бесплатные модели">
              <div className="cart-list-head"><span>БЕСПЛАТНЫЕ</span><span>{Q.free.length}</span></div>
              {Q.free.map(id => <Line key={id} id={id} tag="бесплатно" gift />)}
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
  const router = useRouter();
  const Q = useServerQuote();
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const tg = s.mode === "tg";
  // Способы оплаты из админки; тестовая «только для меня» видна, когда открыта админка в этом браузере
  const ids = [...(s.payMethods || []), ...(me?.admin && s.payTestAdmin && !(s.payMethods || []).includes("test") ? ["test"] : [])];
  const methods = PAY_METHODS.filter(m => ids.includes(m.id));
  const free = Q.total === 0;
  if (!Q.count) return <CartView />;

  // Сервер заново считает сумму, создаёт заказ и платёж в банке и возвращает адрес страницы оплаты.
  const submit = async e => {
    e.preventDefault();
    const f = e.currentTarget, email = f.email.value.trim(), err = {};
    set({ email });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err.email = "Введите email в формате name@mail.ru: на него придёт чек.";
    if (!f.agree.checked) err.agree = "Отметьте согласие с офертой, чтобы перейти к оплате.";
    if (!f.pd.checked) err.pd = "Отметьте согласие на обработку данных: без него мы не сможем прислать чек и файлы.";
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    const { ok, data } = await api("/api/checkout", { method: "POST", body: JSON.stringify({ cart: s.cart, code: s.code, email, agree: true, pd: true, channel: tg ? "tg" : "site", method: f.pm?.value || (free ? "" : methods[0]?.id) }) });
    if (!ok) { setBusy(false); setErrors({ form: data.error || "Не получилось создать заказ. Попробуйте ещё раз." }); return; }
    // В Telegram оплата — во внешнем браузере, а мини-приложение ждёт подтверждения на странице возврата
    if (data.back && data.total > 0 && openPay(data.url)) { router.replace(data.back); return; }
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
          <label className="check-row"><input type="checkbox" name="agree" aria-invalid={!!errors.agree} /><span>Принимаю условия <Link href="/offer" target="_blank">публичной оферты и лицензии</Link>: файлы можно печатать и продавать отпечатки, но нельзя передавать и публиковать</span></label>
          {errors.agree && <span className="err">{errors.agree}</span>}
          <label className="check-row"><input type="checkbox" name="pd" aria-invalid={!!errors.pd} /><span>Даю <Link href="/consent" target="_blank">согласие на обработку персональных данных</Link> в соответствии с <Link href="/privacy" target="_blank">политикой</Link></span></label>
          {errors.pd && <span className="err">{errors.pd}</span>}
          <p className="terms-note">Модели — цифровой товар: файлы доступны сразу после оплаты, скачивать их можно 12 месяцев со дня покупки. Отказаться от покупки можно в течение 7 дней — <Link href="/refund" target="_blank">условия возврата</Link>.</p>
          {errors.form && <span className="err">{errors.form}</span>}
          <button type="submit" className="button button-dark full site-only" disabled={busy || (!free && !methods.length)}>{busy ? "Создаём заказ…" : free ? <>Получить файлы <ArrowRight size={17} /></> : <>Оплатить {rub(Q.total)} <ArrowRight size={17} /></>}</button>
          {!free && methods.some(m => !m.test) && <p className="terms-note">Оплата проходит на защищённой странице банка — <Link href="/payment" target="_blank">о безопасности платежей</Link>{tg ? ". После оплаты вы вернётесь сюда" : ""}.</p>}
        </form>
        <div>
          <Summary title="В заказе" withCode />
          <div className="digital-note"><Download size={17} aria-hidden="true" /><span>Файлы будут доступны сразу после оплаты по уникальной ссылке на заказ и в личном кабинете.</span></div>
        </div>
      </div>
    </div>
  );
}

// Возврат со страницы оплаты: ждём подтверждения от банка и открываем покупки.
export function ReturnView() {
  const { set, setFlash, loadMe } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("order") || "", t = params.get("t") || "";
  const [st, setSt] = useState("wait");
  const [payUrl, setPayUrl] = useState("");
  const inTg = !!tgApp();
  useEffect(() => {
    let alive = true, tries = 0;
    const tick = async () => {
      // С токеном заказ открывается в любом браузере — даже если после приложения банка
      // покупатель вернулся не туда, где оформлял заказ.
      const r = t ? await api(`/api/o/${encodeURIComponent(t)}`) : await api(`/api/orders/${encodeURIComponent(code)}`);
      const ok = r.ok, data = t && r.ok ? { status: r.data.order ? "paid" : r.data.canceled ? "canceled" : "pending" } : r.data;
      if (!alive) return;
      if (t && r.ok && r.data.url) setPayUrl(r.data.url);
      if (ok && ["paid", "review", "revoked"].includes(data.status)) {
        set({ cart: [], code: "" }); setFlash(code); await loadMe(); router.replace("/account"); return;
      }
      if (ok && data.status === "canceled") { setSt("canceled"); return; }
      if (!ok) { setSt("missing"); return; }
      if (++tries > (inTg ? 150 : 60)) { setSt("slow"); return; }
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
          : st === "slow" ? (t ? "Подтверждение задерживается. Сохраните ссылку на заказ ниже: по ней файлы откроются сразу после оплаты, в любом браузере." : "Подтверждение задерживается. Ссылка на файлы придёт на email сразу после оплаты — эту страницу можно закрыть.")
          : st === "missing" ? "Откройте заказ по ссылке из письма."
          : inTg ? "Оплатите заказ на странице банка — она открылась в браузере. Затем вернитесь в Telegram: заказ откроется здесь сам."
          : "Обычно это занимает несколько секунд. Не закрывайте страницу."}</p></div>
      {st === "wait" && <div className="skeleton" aria-busy="true"><span className="spinner" /></div>}
      {inTg && payUrl && ["wait", "slow"].includes(st) && <div className="actions"><button type="button" className="button button-dark" onClick={() => openPay(payUrl)}>Открыть страницу оплаты</button><Link href="/checkout" className="button button-outline">Другой способ оплаты</Link></div>}
      {st === "slow" && t && <p className="order-saved-link"><Link href={`/o/${t}`}>{`${location.origin}/o/${t}`}</Link></p>}
      {st !== "wait" && <div className="actions"><Link href="/cart" className="button button-dark">В корзину</Link><Link href="/account" className="button button-outline">Личный кабинет</Link></div>}
    </div>
  );
}

const STATUS = {
  revoked: "Доступ к файлам этого заказа закрыт. Если это ошибка, напишите нам.",
};

function LinkRequest({ initial = "" }) {
  const [email, setEmail] = useState(initial);
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
        <p className="terms-note" style={{ marginTop: 8 }}>Нажимая «Прислать ссылку», вы соглашаетесь на обработку email по <Link href="/privacy">политике в отношении обработки персональных данных</Link>.</p>
      </form>;
}

// Скачивание: сервер проверяет доступ к заказу, пишет журнал и выдаёт ссылку на файл на 5 минут.
// Начать скачивание. В мини-приложении Telegram — его встроенной загрузкой (или во внешнем браузере):
// внутри Telegram переход по ссылке на файл часто ничего не делает.
function startDownload(url, name) {
  const abs = new URL(url, location.href).href, w = tgApp();
  if (w?.downloadFile) { try { w.downloadFile({ url: abs, file_name: name }); return; } catch {} }
  if (w?.openLink) { try { w.openLink(abs); return; } catch {} }
  location.href = abs;
}

function useDownload(after) {
  const { toast } = useStore();
  const [busy, setBusy] = useState("");
  const download = async (o, id, file) => {
    setBusy(o.id + id + (file || ""));
    const { ok, data } = await api("/api/download", { method: "POST", body: JSON.stringify({ order: o.id, model: id, file }) });
    setBusy("");
    if (!ok) { toast(data.error || "Не получилось скачать. Попробуйте ещё раз."); after?.(); return; }
    startDownload(data.url, data.name || `${id}_${o.id}.stl`);
    toast("Скачивание началось");
    setTimeout(() => after?.(), 800);
  };
  // Все файлы заказа одним ZIP-архивом
  const downloadAll = async o => {
    setBusy(o.id + ":all");
    const { ok, data } = await api("/api/download-all", { method: "POST", body: JSON.stringify({ order: o.id }) });
    setBusy("");
    if (!ok) { toast(data.error || "Не получилось скачать архив. Попробуйте ещё раз."); after?.(); return; }
    startDownload(data.url, `lola.stl_${o.id}.zip`);
    toast(`Скачивание архива началось: ${data.files} ${plural(data.files, ["файл", "файла", "файлов"])}, около ${data.mb} МБ`);
    setTimeout(() => after?.(), 800);
  };
  return { busy, download, downloadAll };
}

// Блок заказа: модели со скачиванием, срок доступа, личная ссылка на заказ и чек
function OrderBlock({ o, dl, showLink = true }) {
  const { byId, toast, flash } = useStore();
  const { busy, download, downloadAll } = dl;
  const blocked = o.status === "revoked";
  const ids = o.items.filter(id => byId[id]);
  const allFiles = ids.flatMap(id => byId[id].files?.length ? byId[id].files : [{ mb: byId[id].mb || 0 }]);
  const allMb = Math.round(allFiles.reduce((a, f) => a + (f.mb || 0), 0));
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
      {!blocked && allFiles.length > 1 && <div className="order-all">
        <button type="button" className="button button-dark" disabled={busy === o.id + ":all"} onClick={() => downloadAll(o)}>
          <Download size={16} aria-hidden="true" /> {busy === o.id + ":all" ? "Готовим архив…" : "Скачать всё одним архивом"}</button>
        <span>{allFiles.length} {plural(allFiles.length, ["файл", "файла", "файлов"])} · около {allMb >= 1024 ? `${(allMb / 1024).toFixed(1).replace(".", ",")} ГБ` : `${allMb} МБ`} · ZIP</span>
      </div>}
      {ids.map(id => {
        const m = byId[id], files = m.files || [];
        const btn = (f, label) => {
          const k = o.id + id + (f?.id || "");
          return <button type="button" className="download-button" disabled={blocked || busy === k} aria-label={`Скачать «${f?.name || m.name}»`} onClick={() => download(o, id, f?.id)}>
            <Download size={16} /><span>{busy === k ? "Готовим…" : label}</span></button>;
        };
        return (
          <div className={"library-item" + (files.length > 1 ? " multi" : "")} key={id}>
            <Link href={modelHref(m)} className="library-thumb" aria-label={`${m.name}: подробнее`}><ModelArt m={m} uid={"o-" + o.id + id} sizes="64px" /></Link>
            <div><b>{m.name}</b><span>{files.length > 1 ? `${files.length} файла · ${m.mb} МБ` : `${m.slug}_${o.id} · ${m.mb} МБ`}</span></div>
            {files.length > 1 ? <div className="file-downloads">
              {files.map(f => <div key={f.id} className="file-dl"><span>{f.name}<small>{f.mb} МБ</small></span>{btn(f, "Скачать")}</div>)}
            </div> : btn(files[0], "Скачать")}
          </div>
        );
      })}
      <div className="order-foot"><span>{o.until && !blocked ? <>Скачивание доступно до <b>{new Date(o.until).toLocaleDateString("ru-RU")}</b> — сохраните файлы на своих устройствах. </> : null}Ссылка на заказ личная — не пересылайте её. Передавать файлы третьим лицам запрещено лицензией.</span>{o.email && <span>Чек отправлен на {o.email}</span>}</div>
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
    else if (data.canceled) setSt({ state: "canceled" });
    else if (data.pending) setSt({ state: "pending", url: data.url });
    else { setSt({ state: "ok", order: data.order }); loadMe(); }
  }, [token, loadMe]);
  useEffect(() => { load(); }, [load]);
  // Пока заказ ждёт оплаты, проверяем раз в 4 секунды (минуты три): банк мог ещё не подтвердить платёж
  useEffect(() => {
    if (st.state !== "pending") return;
    let n = 0;
    const id = setInterval(() => { if (++n > 45) clearInterval(id); else load(); }, 4000);
    return () => clearInterval(id);
  }, [st.state, load]);
  const dl = useDownload(load);
  return (
    <div className="inner-page">
      <div className="page-title"><span className="eyebrow">Ваш заказ</span><h1>{st.order ? `Заказ ${st.order.id}` : "Заказ"}</h1>
        <p>Эта страница всегда открывается по ссылке из письма. Все заказы — в <Link href="/account">личном кабинете</Link>.</p></div>
      {st.state === "load" && <div className="skeleton" aria-busy="true">Открываем заказ…</div>}
      {st.state === "missing" && <div className="empty-state">{st.error || "Заказ не найден."} <Link href="/account">Личный кабинет</Link></div>}
      {st.state === "pending" && <div className="empty-state">Ждём подтверждения оплаты — страница обновится сама. Если вы ещё не оплатили: {st.url && <a href={st.url}>перейти к оплате</a>}</div>}
      {st.state === "canceled" && <div className="empty-state">Оплата этого заказа не прошла, деньги не списаны. <Link href="/cart">Вернуться в корзину</Link></div>}
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
  // Без входа, но с заказами по ссылке из письма — показываем почту из этих заказов, а не «Гость»
  const linkedEmail = !who ? orders.find(o => o.email)?.email || "" : "";
  const spent = orders.filter(o => o.status === "paid").reduce((a, o) => a + o.total, 0);
  const count = orders.reduce((a, o) => a + o.items.length, 0);

  return (
    <div className="inner-page">
      <div className="page-title"><span className="eyebrow">Ваша коллекция</span><h1>Личный кабинет</h1><p>Купленные модели, ссылки на заказы и чеки.</p></div>
      <div className="account-banner">
        <div className="account-avatar" aria-hidden="true">{(who?.email || who?.tg || linkedEmail || "L").replace(/^@/, "")[0].toUpperCase()}</div>
        <div><b>{who ? (who.email || (who.tg ? "Telegram: " + who.tg : "Ваш кабинет")) : linkedEmail || (tg ? "Мини-приложение" : "Гость")}</b>
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
        {me && !who && <LinkRequest initial={linkedEmail} />}
      </>}
    </div>
  );
}
