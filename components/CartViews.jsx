"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, BadgePercent, Download, Gift, Info, Layers, Lock, ShoppingBag, Sparkles, X } from "lucide-react";
import ModelArt from "./ModelArt";
import ProductCard from "./ProductCard";
import { useStore } from "./Store";
import { fmtDate, fmtDay, models, rub, zipMb } from "@/lib/format";
import { modelHref } from "@/lib/models";

// Поле промокода. Код хранится в состоянии; применять или нет, решает расчёт цены.
function PromoField() {
  const { s, set, Q } = useStore();
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
  const { s, Q, promo } = useStore();
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
  const { Q, toggleCart } = useStore();
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
  const { s, set, Q, promo, toast, setFlash } = useStore();
  const router = useRouter();
  const [errors, setErrors] = useState({});
  const [paying, setPaying] = useState(null);
  const tg = s.mode === "tg";
  if (!Q.count) return <CartView />;

  const submit = e => {
    e.preventDefault();
    const f = e.currentTarget, email = f.email.value.trim(), err = {};
    set({ email });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err.email = "Введите email в формате name@mail.ru: на него придёт чек.";
    if (!f.agree.checked) err.agree = "Отметьте согласие с офертой, чтобы перейти к оплате.";
    setErrors(err);
    if (!Object.keys(err).length) setPaying(f.pm.value || "СБП");
  };
  // Заказ хранит снимок: модели, раскладку суммы по позициям чека и применённую скидку.
  const paid = () => {
    const id = "L-" + (1001 + s.orders.length);
    const order = {
      id, date: Date.now(), items: Q.lines.map(l => l.id), lines: Q.lines, total: Q.total,
      sets: Q.bundles.map(x => x.b.name), discount: Q.discount, code: Q.discount?.kind === "code" ? Q.discount.code : "",
      email: s.email, method: paying, promo, own: true, status: "paid", downloads: {}, log: [],
      ch: tg ? "tg" : "site", tg: tg ? "@ваш_аккаунт" : undefined,
    };
    set(p => ({ orders: [...p.orders, order], cart: [], code: "" }));
    setFlash(id);
    router.push("/purchases");
    toast("Оплата прошла. Файлы готовы к скачиванию.");
  };

  return (
    <div className="inner-page">
      <nav className="breadcrumbs" aria-label="Навигация"><Link href="/cart">Корзина</Link><span aria-hidden="true">/</span><span aria-current="page">Оформление заказа</span></nav>
      <div className="page-title"><span className="eyebrow">Последний шаг</span><h1>Оформление заказа</h1><p>Укажите почту — отправим чек и ссылки на файлы.</p></div>
      <div className="checkout-layout">
        <form className="checkout-form" id="coForm" noValidate onSubmit={submit}>
          <h2>Контактные данные</h2>
          <div className="id-note"><Info size={16} aria-hidden="true" />{tg ? "Покупки привязаны к вашему Telegram-аккаунту. Email нужен только для чека." : "Без регистрации: покупки привязываются к email, туда же придут чек и ссылка на «Мои покупки»."}</div>
          <label className="form-label">Email для чека{tg ? "" : " и ссылок"}
            <input type="email" name="email" autoComplete="email" placeholder="name@mail.ru" defaultValue={s.email} aria-invalid={!!errors.email} />
            {errors.email && <span className="err">{errors.email}</span>}
          </label>
          <h2 className="payment-title">Способ оплаты</h2>
          <div className="pay-opts" role="radiogroup" aria-label="Способ оплаты">
            <label className="payment-option"><input type="radio" name="pm" value="СБП" defaultChecked /><span className="payment-icon">⚡</span><span><b>СБП</b><small>По QR-коду или из приложения банка</small></span><span className="radio-dot" /></label>
            <label className="payment-option"><input type="radio" name="pm" value="Карта" /><span className="payment-icon">₽</span><span><b>Банковская карта</b><small>Мир, Visa, Mastercard российских банков</small></span><span className="radio-dot" /></label>
          </div>
          <label className="check-row"><input type="checkbox" name="agree" /><span>Принимаю условия оферты и лицензии: файлы для личного использования и продажи отпечатков, передавать и публиковать файлы нельзя</span></label>
          {errors.agree && <span className="err">{errors.agree}</span>}
          <button type="submit" className="button button-dark full site-only">Оплатить {rub(Q.total)} <ArrowRight size={17} /></button>
          <p className="terms-note">{tg ? "Оплата откроется на защищённой странице ЮKassa, после оплаты бот вернёт вас сюда." : "Оплата проходит на защищённой странице ЮKassa."}</p>
        </form>
        <div>
          <Summary title="В заказе" withCode />
          <div className="digital-note"><Download size={17} aria-hidden="true" /><span>Файлы будут доступны сразу после оплаты в «Моих покупках»: каждую модель можно скачать до {s.downloadLimit || 5} раз по личной ссылке.</span></div>
        </div>
      </div>
      {paying && (
        <div className="paywall" role="dialog" aria-modal="true" aria-label="Оплата">
          <div className="paycard">
            <span className="bank">Страница ЮKassa · имитация</span>
            <span>Заказ в магазине lola.stl</span>
            <b className="amt">{rub(Q.total)}</b>
            <span className="note">В настоящем магазине здесь откроется страница ЮKassa. Сумму заново посчитает сервер, деньги поступят на расчётный счёт ИП, чек по 54-ФЗ уйдёт на email.</span>
            <button type="button" className="button button-dark full" onClick={paid}>Оплатить</button>
            <button type="button" className="button button-outline full" onClick={() => setPaying(null)}>Отменить</button>
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS = {
  review: "Скачивание приостановлено: по заказу заметили необычную активность. Напишите нам — разберёмся и откроем доступ.",
  revoked: "Доступ к файлам этого заказа закрыт. Если это ошибка, напишите нам.",
};

export function PurchasesView() {
  const { s, set, byId, toast, flash } = useStore();
  const [tab, setTab] = useState("orders");
  const tg = s.mode === "tg";
  const limit = s.downloadLimit || 5;
  const orders = s.orders.filter(o => o.own).sort((a, b) => b.date - a.date);
  const favs = (s.favs || []).map(id => byId[id]).filter(m => m && !m.deleted && !m.hidden);

  // Имитация выдачи: в рабочей версии здесь запрос к /api/download/<id>,
  // сервер проверяет покупателя и лимит, пишет журнал и отдаёт ссылку на 5 минут.
  const download = (o, ids) => {
    if (o.status && o.status !== "paid") { toast(STATUS[o.status]); return; }
    const can = ids.filter(id => ((o.downloads || {})[id] || 0) < limit);
    if (!can.length) { toast("Лимит скачиваний исчерпан. Напишите нам — восстановим доступ."); return; }
    const at = Date.now(), ua = (typeof navigator !== "undefined" ? navigator.userAgent : "").slice(0, 80);
    set(p => ({ orders: p.orders.map(x => x.id !== o.id ? x : {
      ...x,
      downloads: can.reduce((d, id) => ({ ...d, [id]: (d[id] || 0) + 1 }), { ...(x.downloads || {}) }),
      log: [...(x.log || []), ...can.map(id => ({ id, at, ua, ch: tg ? "tg" : "site" }))],
    }) }));
    toast(can.length > 1 ? `Готовим архив из ${models(can.length)}. Ссылка действует 5 минут.` : `Ссылка на «${byId[can[0]]?.name}» готова и действует 5 минут.`);
  };

  return (
    <div className="inner-page">
      <div className="page-title"><span className="eyebrow">Ваша коллекция</span><h1>Мои покупки</h1><p>Библиотека моделей, которые уже готовы к печати.</p></div>
      <div className="account-banner">
        <div className="account-avatar" aria-hidden="true">L</div>
        <div><b>{tg ? "Вы вошли через Telegram" : "Ваша библиотека"}</b>
          <p>{tg ? "Бот также присылает ссылку на покупки после каждой оплаты." : "Покупки открываются по личной ссылке из письма. Если открыть её на другом устройстве, новая ссылка придёт на email."}</p></div>
        <Link href="/#catalog" className="text-link">В каталог <ArrowRight size={16} /></Link>
      </div>
      <div className="account-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "orders"} onClick={() => setTab("orders")}>Покупки<small>{orders.length}</small></button>
        <button type="button" role="tab" aria-selected={tab === "favs"} onClick={() => setTab("favs")}>Избранное<small>{favs.length}</small></button>
      </div>

      {tab === "favs" ? (
        favs.length ? <div className="product-grid fav-grid">{favs.map(m => <ProductCard key={m.id} m={m} />)}</div>
          : <div className="empty-state" style={{ marginTop: 26 }}>Отмечайте понравившиеся модели сердцем — они появятся здесь.</div>
      ) : orders.length ? orders.map(o => {
        const blocked = o.status && o.status !== "paid";
        const ids = o.items.filter(id => byId[id]);
        return (
          <section key={o.id} className={"order-block" + (flash === o.id ? " flash" : "") + (blocked ? " blocked" : "")} aria-label={`Заказ ${o.id}`}>
            <div className="order-head">
              <div><b>Заказ {o.id}</b><span>{fmtDate(o.date)} · {models(o.items.length)} · {rub(o.total)} · {o.method}{o.discount ? ` · ${o.discount.label}` : ""}</span></div>
              <button type="button" className="download-button" disabled={blocked} onClick={() => download(o, ids)}><Download size={16} /> Скачать всё архивом</button>
            </div>
            {blocked && <div className="order-alert"><Lock size={16} aria-hidden="true" /><span>{STATUS[o.status]}</span></div>}
            {ids.map(id => {
              const m = byId[id], used = (o.downloads || {})[id] || 0, left = Math.max(0, limit - used);
              return (
                <div className="library-item" key={id}>
                  <Link href={modelHref(m)} className="library-thumb" aria-label={`${m.name}: подробнее`}><ModelArt m={m} uid={"o-" + o.id + id} sizes="64px" /></Link>
                  <div><b>{m.name}</b><span>{m.slug}_{o.id}.zip · {zipMb(m)} МБ · <span className={left ? "" : "err"}>осталось {left} из {limit}</span></span></div>
                  <button type="button" className="download-button" disabled={blocked || !left} aria-label={`Скачать «${m.name}»`} onClick={() => download(o, [id])}><Download size={16} /><span>{left ? "Скачать STL" : "Лимит исчерпан"}</span></button>
                </div>
              );
            })}
            <div className="order-foot"><span>Каждая ссылка на файл живёт 5 минут и работает только у вас. Передавать файлы третьим лицам запрещено лицензией.</span><span>Чек отправлен на {o.email}</span></div>
          </section>
        );
      }) : <div className="empty-state" style={{ marginTop: 26 }}>Покупок пока нет. <Link href="/#catalog">Перейти в каталог</Link></div>}
    </div>
  );
}
