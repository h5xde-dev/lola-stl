"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ModelArt from "./ModelArt";
import { useStore } from "./Store";
import { fmtDate, models, rub, zipMb } from "@/lib/format";
import { modelHref } from "@/lib/models";

function Summary({ withBtn }) {
  const { s, Q, promo } = useStore();
  const pq = Q.pq;
  let hint = null;
  if (pq.free > 0) hint = <div className={"hint" + (promo ? " promo" : "")}><span>Можно выбрать ещё <b>{models(pq.free)}</b> бесплатно.</span><Link href="/">Выбрать подарок →</Link></div>;
  else if (Q.plants.length) hint = <div className="hint warn">Следующая модель: {Q.nextPlant ? "+" + rub(Q.nextPlant) : "бесплатно"}.</div>;
  return (
    <aside className="summary" aria-label="Итог">
      {Q.plants.length > 0 && <>
        <div className="sum-line"><span>Кашпо и модели · {Q.plants.length}</span><span className="v">{rub(pq.price)}{pq.prov ? "*" : ""}</span></div>
        <div className="sum-sub">{pq.P} оплач. + {pq.G} в подарок</div>
      </>}
      {Q.boxes.length > 0 && <>
        <div className="sum-line"><span>Боксы · {Q.boxes.length}</span><span className="v">{rub(Q.bp)}</span></div>
        <div className="sum-sub">{promo ? "по " + rub(s.prices.boxPromo) + " по акции" : "без подарков"}</div>
      </>}
      {hint}
      <div className="sum-total"><span>Итого</span><b>{rub(Q.total)}</b></div>
      {Q.save > 0 && <div className="save">Выгода {rub(Q.save)} по сравнению с покупкой по одной</div>}
      {withBtn && <Link href="/checkout" className="btn primary block site-only" style={{ textAlign: "center", textDecoration: "none" }}>Оформить заказ</Link>}
      {pq.prov && <p className="note">* Цена за {s.prices.prov.join(", ")} оплачиваемых моделей предварительная и будет уточнена.</p>}
    </aside>
  );
}

function Row({ id, tag, gift }) {
  const { byId, toggleCart } = useStore();
  const m = byId[id];
  return (
    <div className="row">
      <Link href={modelHref(m)} className="bed" aria-label={`${m.name}: подробнее`}><ModelArt m={m} uid={"r-" + id} /></Link>
      <div className="row-t"><b>{m.name}</b><span className="meta">{m.mb} МБ · ZIP ≈ {zipMb(m)} МБ</span></div>
      <div className="row-end"><span className={"tag" + (gift ? " gift" : "")}>{tag}</span><button type="button" className="x" onClick={() => toggleCart(id)}>Убрать</button></div>
    </div>
  );
}

export function CartView() {
  const { Q } = useStore();
  if (!Q.count) return <div className="wrap page"><h1>Корзина</h1><div className="empty">Корзина пуста. <Link href="/">Перейти в каталог</Link></div></div>;
  return (
    <div className="wrap page"><h1>Корзина</h1>
      <div className="cols">
        <div style={{ display: "grid", gap: 18, minWidth: 0 }}>
          {Q.plants.length > 0 && <section className="group"><h2>Кашпо и модели</h2>{Q.plants.map((id, i) => <Row key={id} id={id} tag={i < Q.pq.P ? "оплачиваемая" : "подарок"} gift={i >= Q.pq.P} />)}</section>}
          {Q.boxes.length > 0 && <section className="group"><h2>Боксы</h2>{Q.boxes.map(id => <Row key={id} id={id} tag="бокс" />)}</section>}
        </div>
        <Summary withBtn />
      </div>
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
    const id = "L-" + (1043 + s.orders.filter(o => !o.sample).length);
    set(p => ({ orders: [...p.orders, { id, date: Date.now(), items: p.cart.slice(), total: Q.total, email: p.email, method: paying, promo, own: true, ch: tg ? "tg" : "site", tg: tg ? "@ваш_аккаунт" : undefined }], cart: [] }));
    setFlash(id);
    router.push("/purchases");
    toast("Оплата прошла. Файлы готовы к скачиванию.");
  };

  return (
    <div className="wrap page"><h1>Оформление</h1>
      <div className="cols">
        <form className="form" id="coForm" noValidate onSubmit={submit}>
          <div className="idnote">{tg ? "Покупки привязаны к вашему Telegram-аккаунту. Email нужен только для чека." : "Без регистрации: покупки привязываются к email, туда же придут чек и ссылки на файлы."}</div>
          <div className="field"><label htmlFor="email">Email для чека{tg ? "" : " и ссылок"}</label>
            <input type="email" id="email" name="email" autoComplete="email" placeholder="name@mail.ru" defaultValue={s.email} />
            {errors.email && <span className="err">{errors.email}</span>}</div>
          <div className="field"><span className="lbl">Способ оплаты</span>
            <div className="pay-opts">
              <label className="pay-opt"><input type="radio" name="pm" value="СБП" defaultChecked /><span><b>СБП</b><small>по QR или из приложения банка</small></span></label>
              <label className="pay-opt"><input type="radio" name="pm" value="Карта" /><span><b>Банковская карта</b><small>Мир, Visa, Mastercard российских банков</small></span></label>
            </div></div>
          <label className="check"><input type="checkbox" name="agree" /><span>Принимаю условия оферты и лицензии на использование моделей</span></label>
          {errors.agree && <span className="err">{errors.agree}</span>}
          <button type="submit" className="btn primary block site-only">Оплатить {rub(Q.total)}</button>
          <p className="note">Оплата проходит на защищённой странице платёжного сервиса. После оплаты файлы откроются автоматически.</p>
        </form>
        <Summary />
      </div>
      {paying && (
        <div className="paywall" role="dialog" aria-modal="true" aria-label="Оплата">
          <div className="paycard">
            <span className="bank">Платёжная страница · имитация</span>
            <span>Заказ в магазине lola.stl</span>
            <b className="amt">{rub(Q.total)}</b>
            <span className="note">В настоящем магазине здесь откроется страница ЮKassa или другого сервиса. Деньги поступят на расчётный счёт ИП, чек уйдёт на email.</span>
            <button type="button" className="btn primary block" onClick={paid}>Оплатить</button>
            <button type="button" className="btn block" onClick={() => setPaying(null)}>Отменить</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PurchasesView() {
  const { s, byId, toast, flash } = useStore();
  const tg = s.mode === "tg";
  const orders = s.orders.filter(o => o.own).sort((a, b) => b.date - a.date);
  const now = Date.now();
  return (
    <div className="wrap page"><h1>Мои покупки</h1>
      <div className="idnote">{tg ? "Вы вошли через Telegram. Бот также присылает ссылки в чат после каждой оплаты." : "На сайте покупки открываются по ссылке из письма. Можно войти через Telegram, тогда здесь будут и покупки из мини-приложения."}</div>
      {orders.length ? orders.map(o => {
        const exp = Math.max(o.date, now - 6 * 36e5) + 864e5;
        return (
          <article key={o.id} className={"order" + (flash === o.id ? " flash" : "")}>
            <div className="order-h">
              <div><b>Заказ {o.id}</b>{o.sample && <> <span className="tag">пример</span></>}<p className="meta">{fmtDate(o.date)} · {models(o.items.length)} · {rub(o.total)} · {o.method}</p></div>
              <button type="button" className="btn" onClick={() => toast("В магазине здесь скачается один ZIP со всеми моделями заказа.")}>Скачать всё одним архивом</button>
            </div>
            <div className="files">
              {o.items.filter(id => byId[id]).map(id => { const m = byId[id]; return (
                <div className="file" key={id}>
                  <Link href={modelHref(m)} className="bed" aria-label={`${m.name}: подробнее`}><ModelArt m={m} uid={"o-" + o.id + id} /></Link>
                  <div className="row-t"><b>{m.name}</b><span className="meta">{m.slug}.zip · {zipMb(m)} МБ</span></div>
                  <button type="button" className="btn" onClick={() => toast(`В прототипе файл не скачивается. В магазине откроется личная ссылка на «${m.name}».`)}>Скачать</button>
                </div>); })}
            </div>
            <div className="order-f"><span>Ссылки действуют до {fmtDate(exp)}. Потом их можно обновить здесь же, бесплатно.</span><span>Чек отправлен на {o.email}</span></div>
          </article>
        );
      }) : <div className="empty">Покупок пока нет. <Link href="/">Перейти в каталог</Link></div>}
    </div>
  );
}
