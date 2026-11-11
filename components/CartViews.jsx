"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Download, Gift, Info, ShoppingBag, Sparkles, X } from "lucide-react";
import ModelArt from "./ModelArt";
import ProductCard from "./ProductCard";
import { useStore } from "./Store";
import { fmtDate, fmtDay, models, rub, zipMb } from "@/lib/format";
import { modelHref } from "@/lib/models";

function Summary({ title = "Ваш заказ", withBtn }) {
  const { s, Q, promo } = useStore();
  const pq = Q.pq;
  return (
    <aside className="summary-card" aria-label="Итог">
      <h2>{title}</h2>
      <div className={"promo-now" + (promo ? " on" : "")}>
        {promo ? <Gift size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
        <span>{promo ? `Действует «1+1» до ${fmtDay(s.promoEnd)}` : "Действует «2+1»"}. Боксы считаются отдельно.</span>
      </div>
      {Q.plants.length > 0 && <>
        <div className="summary-row"><span>Кашпо и модели · {Q.plants.length}</span><b>{rub(pq.price)}{pq.prov ? "*" : ""}</b></div>
        <div className="summary-sub">{pq.P} оплачиваемых <span className="gift-count">+ {pq.G} в подарок</span></div>
      </>}
      {Q.boxes.length > 0 && <>
        <div className="summary-row"><span>Боксы · {Q.boxes.length}</span><b>{rub(Q.bp)}</b></div>
        <div className="summary-sub">{promo ? "по " + rub(s.prices.boxPromo) + " по акции" : "без подарков"}</div>
      </>}
      {pq.free > 0
        ? <div className="summary-hint"><span>Можно выбрать ещё <b>{models(pq.free)}</b> бесплатно.</span><Link href="/#catalog">Выбрать подарок →</Link></div>
        : Q.plants.length > 0 && <div className="summary-hint plain">Следующая модель: {Q.nextPlant ? "+" + rub(Q.nextPlant) : "бесплатно"}.</div>}
      <div className="summary-total"><span>К оплате</span><strong>{rub(Q.total)}</strong></div>
      {Q.save > 0 && <div className="summary-save">Выгода {rub(Q.save)} по сравнению с покупкой по одной</div>}
      {withBtn && <Link href="/checkout" className="button button-dark full site-only">Перейти к оплате <ArrowRight size={17} /></Link>}
      {pq.prov && <p className="price-warning">* Цена за {s.prices.prov.join(", ")} оплачиваемых моделей предварительная и будет уточнена.</p>}
      {withBtn && <small className="summary-footnote">Файлы для скачивания появятся сразу после оплаты.</small>}
    </aside>
  );
}

function Line({ id, tag, gift }) {
  const { byId, toggleCart } = useStore();
  const m = byId[id];
  return (
    <div className="cart-line">
      <Link href={modelHref(m)} className="cart-thumb" aria-label={`${m.name}: подробнее`}><ModelArt m={m} uid={"r-" + id} /></Link>
      <Link href={modelHref(m)} className="cart-line-name"><b>{m.name}</b><span>STL · {m.mb} МБ<span className="zip"> · ZIP ≈ {zipMb(m)} МБ</span></span></Link>
      <span className={"line-tag" + (gift ? " gift" : "")}>{tag}</span>
      <button type="button" className="remove-button" aria-label={`Убрать «${m.name}»`} onClick={() => toggleCart(id)}><X size={17} /></button>
    </div>
  );
}

export function CartView() {
  const { Q } = useStore();
  return (
    <div className="inner-page">
      <div className="page-title"><span className="eyebrow">Ваш выбор</span><h1>Корзина</h1><p>Проверьте, что войдёт в заказ. Подарки корзина отмечает сама.</p></div>
      {!Q.count ? (
        <div className="cart-empty">
          <div className="empty-bag"><ShoppingBag size={28} /></div>
          <h2>Пока здесь пусто</h2><p>Добавьте модели, которые хочется напечатать.</p>
          <Link href="/#catalog" className="button button-dark">В каталог <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            {Q.plants.length > 0 && <section className="cart-group" aria-label="Кашпо и модели">
              <div className="cart-list-head"><span>КАШПО И МОДЕЛИ</span><span>{Q.pq.P} + {Q.pq.G}</span></div>
              {Q.plants.map((id, i) => <Line key={id} id={id} tag={i < Q.pq.P ? "оплачиваемая" : "подарок"} gift={i >= Q.pq.P} />)}
            </section>}
            {Q.boxes.length > 0 && <section className="cart-group" aria-label="Боксы">
              <div className="cart-list-head"><span>БОКСЫ</span><span>{Q.boxes.length}</span></div>
              {Q.boxes.map(id => <Line key={id} id={id} tag="бокс" />)}
            </section>}
            <Link href="/#catalog" className="continue-link"><ArrowLeft size={15} /> Продолжить покупки</Link>
          </div>
          <Summary withBtn />
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
  const paid = () => {
    const id = "L-" + (1001 + s.orders.length);
    set(p => ({ orders: [...p.orders, { id, date: Date.now(), items: p.cart.slice(), total: Q.total, email: p.email, method: paying, promo, own: true, ch: tg ? "tg" : "site", tg: tg ? "@ваш_аккаунт" : undefined }], cart: [] }));
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
          <div className="id-note"><Info size={16} aria-hidden="true" />{tg ? "Покупки привязаны к вашему Telegram-аккаунту. Email нужен только для чека." : "Без регистрации: покупки привязываются к email, туда же придут чек и ссылки на файлы."}</div>
          <label className="form-label">Email для чека{tg ? "" : " и ссылок"}
            <input type="email" name="email" autoComplete="email" placeholder="name@mail.ru" defaultValue={s.email} aria-invalid={!!errors.email} />
            {errors.email && <span className="err">{errors.email}</span>}
          </label>
          <h2 className="payment-title">Способ оплаты</h2>
          <div className="pay-opts" role="radiogroup" aria-label="Способ оплаты">
            <label className="payment-option"><input type="radio" name="pm" value="СБП" defaultChecked /><span className="payment-icon">⚡</span><span><b>СБП</b><small>По QR-коду или из приложения банка</small></span><span className="radio-dot" /></label>
            <label className="payment-option"><input type="radio" name="pm" value="Карта" /><span className="payment-icon">₽</span><span><b>Банковская карта</b><small>Мир, Visa, Mastercard российских банков</small></span><span className="radio-dot" /></label>
          </div>
          <label className="check-row"><input type="checkbox" name="agree" /><span>Принимаю условия оферты и лицензии на использование моделей</span></label>
          {errors.agree && <span className="err">{errors.agree}</span>}
          <button type="submit" className="button button-dark full site-only">Оплатить {rub(Q.total)} <ArrowRight size={17} /></button>
          <p className="terms-note">Оплата проходит на защищённой странице платёжного сервиса.</p>
        </form>
        <div>
          <Summary title="В заказе" />
          <div className="digital-note"><Download size={17} aria-hidden="true" /><span>Файлы STL будут доступны сразу после подтверждения оплаты и останутся в «Моих покупках».</span></div>
        </div>
      </div>
      {paying && (
        <div className="paywall" role="dialog" aria-modal="true" aria-label="Оплата">
          <div className="paycard">
            <span className="bank">Платёжная страница · имитация</span>
            <span>Заказ в магазине lola.stl</span>
            <b className="amt">{rub(Q.total)}</b>
            <span className="note">В настоящем магазине здесь откроется страница ЮKassa или другого сервиса. Деньги поступят на расчётный счёт ИП, чек уйдёт на email.</span>
            <button type="button" className="button button-dark full" onClick={paid}>Оплатить</button>
            <button type="button" className="button button-outline full" onClick={() => setPaying(null)}>Отменить</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PurchasesView() {
  const { s, byId, toast, flash } = useStore();
  const [tab, setTab] = useState("orders");
  const tg = s.mode === "tg";
  const orders = s.orders.filter(o => o.own).sort((a, b) => b.date - a.date);
  const favs = (s.favs || []).map(id => byId[id]).filter(m => m && !m.deleted && !m.hidden);
  const now = Date.now();
  return (
    <div className="inner-page">
      <div className="page-title"><span className="eyebrow">Ваша коллекция</span><h1>Мои покупки</h1><p>Библиотека моделей, которые уже готовы к печати.</p></div>
      <div className="account-banner">
        <div className="account-avatar" aria-hidden="true">L</div>
        <div><b>{tg ? "Вы вошли через Telegram" : "Ваша библиотека"}</b>
          <p>{tg ? "Бот также присылает ссылки в чат после каждой оплаты." : "Покупки открываются по ссылке из письма. Файлы можно скачать повторно."}</p></div>
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
        const exp = Math.max(o.date, now - 6 * 36e5) + 864e5;
        return (
          <section key={o.id} className={"order-block" + (flash === o.id ? " flash" : "")} aria-label={`Заказ ${o.id}`}>
            <div className="order-head">
              <div><b>Заказ {o.id}</b>{o.sample && <span className="sample-tag">пример</span>}<span>{fmtDate(o.date)} · {models(o.items.length)} · {rub(o.total)} · {o.method}</span></div>
              <button type="button" className="download-button" onClick={() => toast("В магазине здесь скачается один ZIP со всеми моделями заказа.")}><Download size={16} /> Скачать всё архивом</button>
            </div>
            {o.items.filter(id => byId[id]).map(id => { const m = byId[id]; return (
              <div className="library-item" key={id}>
                <Link href={modelHref(m)} className="library-thumb" aria-label={`${m.name}: подробнее`}><ModelArt m={m} uid={"o-" + o.id + id} /></Link>
                <div><b>{m.name}</b><span>{m.slug}.zip · {zipMb(m)} МБ</span></div>
                <button type="button" className="download-button" aria-label={`Скачать «${m.name}»`} onClick={() => toast(`В прототипе файл не скачивается. В магазине откроется личная ссылка на «${m.name}».`)}><Download size={16} /><span>Скачать STL</span></button>
              </div>); })}
            <div className="order-foot"><span>Ссылки действуют до {fmtDate(exp)}, потом их можно бесплатно обновить здесь.</span><span>Чек отправлен на {o.email}</span></div>
          </section>
        );
      }) : <div className="empty-state" style={{ marginTop: 26 }}>Покупок пока нет. <Link href="/#catalog">Перейти в каталог</Link></div>}
    </div>
  );
}
