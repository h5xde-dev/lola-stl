"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, LayoutGrid, Plus, ReceiptText, Sparkles } from "lucide-react";
import ModelArt from "./ModelArt";
import { Brand } from "./Shell";
import { useStore } from "./Store";
import { kindName, slugify } from "@/lib/models";
import { paidPrice, plantQuote } from "@/lib/pricing";
import { fmtDay, fmtSize, models, rub, zipMb } from "@/lib/format";

const live = s => s.models.filter(m => !m.deleted);

export function AdminShell({ children }) {
  const { s, promo } = useStore();
  const path = usePathname();
  const tab = path.startsWith("/admin/prices") ? "prices" : path.startsWith("/admin/orders") ? "orders" : "models";
  const link = (href, Icon, t, n, k) => <Link href={href} aria-current={tab === k ? "page" : undefined}><Icon size={17} aria-hidden="true" /><span>{t}</span><small>{n}</small></Link>;
  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <Brand sub="АДМИН-ПАНЕЛЬ" href="/admin" />
        <nav aria-label="Разделы админки">
          {link("/admin", LayoutGrid, "Модели", live(s).length, "models")}
          {link("/admin/orders", ReceiptText, "Заказы", s.orders.length, "orders")}
          {link("/admin/prices", Sparkles, "Цены и акции", promo ? "1+1" : "2+1", "prices")}
        </nav>
        <Link href="/" className="back-store"><ArrowLeft size={14} /> На сайт</Link>
      </aside>
      <section className="admin-main">{children}</section>
    </div>
  );
}

const Eyebrow = () => <span className="eyebrow">Магазин · управление</span>;

export function AdminModels() {
  const { s, set, toast } = useStore();
  const [q, setQ] = useState("");
  const L = live(s), hid = L.filter(m => m.hidden).length, mb = L.reduce((a, m) => a + (m.mb || 0), 0);
  const sales = {};
  s.orders.forEach(o => o.items.forEach(id => { sales[id] = (sales[id] || 0) + 1; }));
  const list = L.filter(m => !q.trim() || m.name.toLowerCase().includes(q.trim().toLowerCase()));
  const pub = (m, on) => {
    set(p => ({ models: p.models.map(x => x.id === m.id ? { ...x, hidden: !on } : x) }));
    toast(on ? `«${m.name}» снова в каталоге` : `«${m.name}» скрыта из каталога`);
  };
  return (
    <>
      <div className="adm-h"><div><Eyebrow /><h1>Модели</h1></div><Link href="/admin/models/new" className="button button-dark"><Plus size={16} /> Добавить модель</Link></div>
      <div className="stat-row">
        <div className="stat"><span>В каталоге</span><b>{L.length - hid}</b></div>
        <div className="stat"><span>Скрыто</span><b>{hid}</b></div>
        <div className="stat"><span>Файлы в хранилище</span><b>{fmtSize(mb)}</b></div>
      </div>
      <input className="search" type="search" placeholder="Найти модель" value={q} onChange={e => setQ(e.target.value)} aria-label="Найти модель" />
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th></th><th>Название</th><th>Тип</th><th className="r">Файл</th><th className="r">Продажи</th><th>В каталоге</th><th></th></tr></thead>
        <tbody>
          {list.length ? list.map(m => (
            <tr key={m.id} className={m.hidden ? "off" : ""}>
              <td><div className="thumb"><ModelArt m={m} uid={"a-" + m.id} /></div></td>
              <td><b>{m.name}</b>{m.isNew && <> <span className="tag">новинка</span></>}<div className="meta">{m.dims || "размер не указан"} · /models/{m.slug}</div></td>
              <td>{kindName(m)}</td>
              <td className="r mono">{m.mb ? m.mb + " МБ" : "нет файла"}</td>
              <td className="r">{sales[m.id] || 0}</td>
              <td><label className="switch" title={m.mb ? "" : "Сначала загрузите STL-файл"}>
                <input type="checkbox" checked={!m.hidden} disabled={!m.mb} onChange={e => pub(m, e.target.checked)} aria-label={`Показывать «${m.name}» в каталоге`} /><span className="track" /></label></td>
              <td className="r"><Link href={`/admin/models/${m.id}`} className="mini-btn">Изменить</Link></td>
            </tr>
          )) : <tr><td colSpan={7} className="meta" style={{ padding: 20 }}>Ничего не нашлось.</td></tr>}
        </tbody>
      </table></div>
      <p className="note">Скрытая модель пропадает из каталога, но у тех, кто её купил, файл остаётся в «Моих покупках».</p>
    </>
  );
}

const newDraft = () => ({ id: "u" + Date.now().toString(36), slug: "", name: "", cat: "plant", n: 6, twist: 1, prof: "cone", color: "#9fc7b0", h: .6, r: .26, mb: 0, hidden: true, isNew: true, photos: [], dims: "", print: "", desc: "", custom: true });

export function AdminEditor({ id }) {
  const { s, set, byId, toast } = useStore();
  const router = useRouter();
  const isNew = id === "new";
  const [d, setD] = useState(() => isNew ? newDraft() : byId[id] ? { photos: [], ...JSON.parse(JSON.stringify(byId[id])) } : null);
  const [err, setErr] = useState("");
  const [upload, setUpload] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const timer = useRef();
  useEffect(() => () => clearInterval(timer.current), []);

  if (!d || d.deleted) return <div className="empty">Модель не найдена. <Link href="/admin">К списку</Link></div>;
  const upd = patch => setD(p => ({ ...p, ...patch }));
  const hasPh = d.photos && d.photos.length;

  const startUpload = f => {
    if (!f) return;
    clearInterval(timer.current);
    const total = Math.max(1, f.size / 1048576);
    let done = 0;
    setUpload({ total, done });
    timer.current = setInterval(() => {
      done = Math.min(total, done + Math.max(total / 30, .5));
      if (done >= total) { clearInterval(timer.current); setUpload(null); upd({ mb: Math.max(1, Math.round(total)), file: f.name }); toast("Файл загружен"); }
      else setUpload({ total, done });
    }, 120);
  };
  const addPhotos = files => {
    const list = Array.from(files || []).slice(0, 8);
    if (!list.length) return;
    let left = list.length, bad = 0;
    const out = [];
    const done = () => { if (--left === 0) { setD(p => ({ ...p, photos: [...(p.photos || []), ...out] })); toast(bad ? "Часть файлов не открылась как изображение" : "Фото добавлены"); } };
    list.forEach(f => {
      const url = URL.createObjectURL(f), img = new Image();
      img.onload = () => {
        const k = Math.min(1, 640 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        try { out.push(c.toDataURL("image/jpeg", .8)); } catch { bad++; }
        URL.revokeObjectURL(url); done();
      };
      img.onerror = () => { URL.revokeObjectURL(url); bad++; done(); };
      img.src = url;
    });
  };
  const save = () => {
    if (upload) { toast("Дождитесь окончания загрузки файла"); return; }
    const name = (d.name || "").trim();
    if (!name) { setErr("Укажите название: его видят покупатели."); document.getElementById("fName")?.focus(); return; }
    let slug = d.slug || slugify(name);
    const taken = new Set(s.models.filter(m => m.id !== d.id).map(m => m.slug));
    for (let i = 2; taken.has(slug); i++) slug = slugify(name) + "-" + i;
    const next = { ...d, name, slug };
    let warn = "";
    if (!next.mb && !next.hidden) { next.hidden = true; warn = " Модель скрыта, пока не загружен STL-файл."; }
    const exists = s.models.some(m => m.id === d.id);
    set(p => ({ models: exists ? p.models.map(m => m.id === d.id ? next : m) : [next, ...p.models] }));
    router.push("/admin");
    toast((exists ? "Изменения сохранены." : `«${name}» добавлена${next.hidden ? " (скрыта)" : " в каталог"}.`) + warn);
  };
  const del = () => {
    set(p => ({ models: p.models.map(m => m.id === d.id ? { ...m, deleted: true, hidden: true } : m), cart: p.cart.filter(x => x !== d.id) }));
    router.push("/admin");
    toast(`«${d.name}» удалена из каталога`);
  };
  const opt = (v, t) => <option value={v}>{t}</option>;

  return (
    <>
      <div className="adm-h"><div><span className="eyebrow">Модели · {isNew ? "новая" : "редактирование"}</span><h1>{isNew ? "Новая модель" : d.name || "Модель"}</h1></div><Link href="/admin" className="button button-outline"><ArrowLeft size={16} /> К списку</Link></div>
      <div className="editor">
        <div style={{ display: "grid", gap: 14, alignContent: "start", minWidth: 0 }}>
          <div className="editor-art"><ModelArt m={d} uid="ed" /></div>
          <div className="f"><span className="lbl">Фото</span>
            {hasPh ? <div className="photos">{d.photos.map((p, i) => (
              <span key={i}><img src={p} alt={`Фото ${i + 1}`} className={i ? "" : "cover"} />
                <button type="button" className="ph-x" aria-label={`Удалить фото ${i + 1}`} onClick={() => upd({ photos: d.photos.filter((_, j) => j !== i) })}>×</button></span>))}</div> : null}
            <div className="drop"><label className="mini-btn" htmlFor="photoIn">Добавить фото</label>
              <input type="file" id="photoIn" accept="image/*" multiple hidden onChange={e => { addPhotos(e.target.files); e.target.value = ""; }} />
              <span>Первое фото станет обложкой в каталоге и картинкой для соцсетей. Снимки сжимаются автоматически.</span></div></div>
          {!hasPh && (
            <div className="panel" style={{ padding: 14, gap: 10 }}>
              <span className="lbl" style={{ fontWeight: 700, fontSize: 13 }}>Схема вместо фото</span>
              <p className="panel-sub">Только в прототипе. В магазине здесь будут ваши фото.</p>
              <div className="f"><label htmlFor="fColor">Цвет пластика</label><input type="color" id="fColor" value={d.color} onChange={e => upd({ color: e.target.value })} /></div>
              <div className="f"><label htmlFor="fProf">Силуэт</label><select id="fProf" value={d.prof} onChange={e => upd({ prof: e.target.value })}>{opt("cyl", "Цилиндр")}{opt("cone", "Конус")}{opt("bulb", "Капля")}{opt("bowl", "Чаша")}{opt("hour", "С талией")}{opt("wave", "Волна")}</select></div>
              <div className="f"><label htmlFor="fN">Граней: {d.n || "гладкое"}</label><input type="range" id="fN" min="0" max="24" step="1" value={d.n || 0} onChange={e => upd({ n: +e.target.value, round: false })} /></div>
              <div className="f"><label htmlFor="fTw">Закрутка</label><input type="range" id="fTw" min="0" max="3.5" step="0.1" value={d.twist || 0} onChange={e => upd({ twist: +e.target.value })} /></div>
            </div>
          )}
        </div>
        <div className="panel">
          <div className="fgrid">
            <div className="f"><label htmlFor="fName">Название</label><input type="text" id="fName" value={d.name} placeholder="Например, Волна-2" onChange={e => upd({ name: e.target.value })} />{err && <span className="err">{err}</span>}</div>
            <div className="f"><label htmlFor="fCat">Тип</label>
              <select id="fCat" value={d.cat} onChange={e => { const c = e.target.value; upd({ cat: c, h: c === "box" ? .42 : .6, r: c === "box" ? .3 : .26 }); }}>{opt("plant", "Кашпо и другие модели")}{opt("box", "Бокс")}</select>
              <small>{d.cat === "box" ? "Считается по ценам боксов, без подарков." : "Участвует в «2+1» и «1+1»."}</small></div>
          </div>
          <div className="f"><label htmlFor="fDesc">Описание</label><textarea id="fDesc" value={d.desc} placeholder="Пара предложений о модели. Попадает в поиск Яндекса и Google." onChange={e => upd({ desc: e.target.value })} /></div>
          <div className="fgrid">
            <div className="f"><label htmlFor="fDims">Размер после печати</label><input type="text" id="fDims" value={d.dims} placeholder="120 × 120 × 118 мм" onChange={e => upd({ dims: e.target.value })} /></div>
            <div className="f"><label htmlFor="fPrint">Настройки печати</label><input type="text" id="fPrint" value={d.print} placeholder="режим вазы, сопло 0,6 мм" onChange={e => upd({ print: e.target.value })} /></div>
            <div className="f"><label htmlFor="fSlug">Адрес страницы</label><input type="text" id="fSlug" value={d.slug} placeholder={slugify(d.name || "model")} onChange={e => upd({ slug: slugify(e.target.value) })} /><small>/models/{d.slug || slugify(d.name || "model")}</small></div>
          </div>
          <div className="f"><span className="lbl">STL-файл</span>
            <div className="drop">
              {upload ? <>
                <div className="prog"><i style={{ width: Math.round(upload.done / upload.total * 100) + "%" }} /></div>
                <span className="mono" style={{ fontSize: 12, color: "var(--ink)" }}>Загрузка частями · {Math.round(upload.done)} из {Math.round(upload.total)} МБ</span>
                <small>Если связь оборвётся, загрузка продолжится с того же места.</small>
              </> : <>
                {d.mb ? <><span className="mono" style={{ fontSize: 13, color: "var(--ink)" }}>{d.file || (d.slug || "model") + ".stl"} · {d.mb} МБ</span><span>Покупатель получит ZIP ≈ {zipMb(d)} МБ.</span></>
                  : <span>Файл не загружен. Без файла модель нельзя показать в каталоге.</span>}
                <label className="mini-btn" htmlFor="stlIn">{d.mb ? "Заменить файл" : "Выбрать STL или ZIP"}</label>
                <input type="file" id="stlIn" accept=".stl,.zip" hidden onChange={e => { startUpload(e.target.files?.[0]); e.target.value = ""; }} />
                <small>В прототипе файл никуда не отправляется.</small>
              </>}
            </div></div>
          <div className="actions">
            <label className="check"><input type="checkbox" checked={!!d.isNew} onChange={e => upd({ isNew: e.target.checked })} /><span>Отметить как новинку</span></label>
            <label className="check"><input type="checkbox" checked={!!d.vase} onChange={e => upd({ vase: e.target.checked })} /><span>Печать в режиме вазы</span></label>
            <label className="check"><input type="checkbox" checked={!d.hidden} onChange={e => upd({ hidden: !e.target.checked })} /><span>Показывать в каталоге</span></label>
          </div>
          <div className="actions">
            <button type="button" className="btn primary" onClick={save}>{isNew ? "Добавить модель" : "Сохранить"}</button>
            <Link href="/admin" className="btn">Отмена</Link>
            {!isNew && <button type="button" className="btn danger" style={{ marginLeft: "auto" }} onClick={() => setConfirmDel(true)}>Удалить модель</button>}
          </div>
          {confirmDel && <div className="confirm"><span>Модель пропадёт из каталога и админки. Те, кто её уже купил, сохранят доступ к файлу.</span>
            <button type="button" className="btn danger" onClick={del}>Удалить</button><button type="button" className="btn" onClick={() => setConfirmDel(false)}>Оставить</button></div>}
          {d.custom && <p className="note">Модель хранится только в этом браузере. Её страница видна вам, но поисковики увидят модели после подключения базы данных.</p>}
        </div>
      </div>
    </>
  );
}

function PriceCell({ k, label, val, prov, onSave }) {
  const id = "pr-" + k.replace(".", "-");
  return (
    <div className={"pcell" + (prov ? " prov" : "")}><label htmlFor={id}>{label}</label>
      <input type="number" min="1" step="10" id={id} defaultValue={val} key={val} inputMode="numeric"
        onBlur={e => { if (+e.target.value !== +val && !onSave(k, e.target.value)) e.target.value = val; }}
        onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} />
      {prov && <span className="flag">не согласована</span>}</div>
  );
}

export function AdminPrices() {
  const { s, set, promo: on, toast } = useStore();
  const pr = s.prices;
  const isProv = P => pr.prov.includes(P);
  const setPrice = (key, raw) => {
    const v = Math.round(Number(raw));
    if (!Number.isFinite(v) || v <= 0) { toast("Цена должна быть больше нуля"); return false; }
    const [k, sub] = key.split(".");
    set(p => {
      const n = JSON.parse(JSON.stringify(p.prices));
      if (sub) n[k][sub] = v; else n[k] = v;
      if (k === "paid") n.prov = n.prov.filter(x => x !== +sub);
      return { prices: n };
    });
    toast("Цена сохранена. Корзина уже считает по ней.");
    return true;
  };
  const issues = [];
  for (let P = 2; P <= 8; P++) if (paidPrice(pr, P) <= paidPrice(pr, P - 1)) issues.push(`за ${models(P)} (${rub(paidPrice(pr, P))}) не дороже, чем за ${P - 1} (${rub(paidPrice(pr, P - 1))})`);
  if (+pr.box[2] <= +pr.box[1] || +pr.box[3] <= +pr.box[2] || pr.box4 * 4 <= +pr.box[3]) issues.push("цена боксов не растёт с количеством");

  return (
    <>
      <div className="adm-h"><div><Eyebrow /><h1>Цены и акции</h1></div><span className={"st" + (on ? "" : " off")}>Сейчас действует {on ? "«1+1»" : "«2+1»"}</span></div>
      {issues.length > 0 && <div className="warn-box">Проверьте цены: {issues.join("; ")}.</div>}
      <section className="panel"><h2>Акция «1+1»</h2>
        <p className="panel-sub">За каждую оплаченную модель покупатель выбирает одну в подарок. «2+1» в это время не действует, боксы идут по цене акции.</p>
        <div className="actions">
          <label className="switch"><input type="checkbox" checked={!!s.promo} disabled={s.promoAuto} onChange={e => { set({ promo: e.target.checked }); toast(e.target.checked ? "Акция «1+1» включена" : "Акция выключена, снова действует «2+1»"); }} /><span className="track" />Включить сейчас</label>
          <label className="check"><input type="checkbox" checked={!!s.promoAuto} onChange={e => { set({ promoAuto: e.target.checked }); toast(e.target.checked ? `Акция включится ${fmtDay(s.promoStart)} и закончится после ${fmtDay(s.promoEnd)}` : "Автовключение по датам отключено"); }} /><span>Включать автоматически по датам</span></label>
        </div>
        <div className="fgrid">
          <div className="f"><label htmlFor="pStart">Начало</label><input type="date" id="pStart" value={s.promoStart} onChange={e => e.target.value && set({ promoStart: e.target.value })} /></div>
          <div className="f"><label htmlFor="pEnd">Последний день</label><input type="date" id="pEnd" value={s.promoEnd} onChange={e => e.target.value && set({ promoEnd: e.target.value })} /><small>На сайте: «Акция до {fmtDay(s.promoEnd)}».</small>
            {s.promoEnd < s.promoStart && <span className="err">Последний день раньше начала.</span>}</div>
        </div>
      </section>
      <section className="panel"><h2>Кашпо и другие модели</h2>
        <p className="panel-sub">Цена за количество оплачиваемых моделей. Подарочные добавляются сверху.</p>
        <div className="price-grid">
          {[1, 2, 3, 4, 5, 6, 7].map(P => <PriceCell onSave={setPrice} key={P} k={"paid." + P} label={models(P)} val={pr.paid[P]} prov={isProv(P)} />)}
          <PriceCell onSave={setPrice} k="per8" label="от 8, за каждую" val={pr.per8} />
        </div>
        {pr.prov.length > 0 && <p className="note">Цен за {pr.prov.join(", ")} модели не было в задании, здесь стоят предварительные. Измените цену, и она станет согласованной.</p>}
      </section>
      <section className="panel"><h2>Боксы</h2>
        <p className="panel-sub">Без подарков. Во время акции действует одна цена за штуку.</p>
        <div className="price-grid">
          <PriceCell onSave={setPrice} k="box.1" label="1 бокс" val={pr.box[1]} /><PriceCell onSave={setPrice} k="box.2" label="2 бокса" val={pr.box[2]} /><PriceCell onSave={setPrice} k="box.3" label="3 бокса" val={pr.box[3]} />
          <PriceCell onSave={setPrice} k="box4" label="от 4, за штуку" val={pr.box4} /><PriceCell onSave={setPrice} k="boxPromo" label="по акции, за штуку" val={pr.boxPromo} />
        </div>
      </section>
      <section className="panel"><h2>Проверка: что покажет корзина</h2>
        <p className="panel-sub">Сколько моделей оплачивается и сколько идёт в подарок, при каждом количестве.</p>
        <div className="tbl-wrap"><table className="tbl compact">
          <thead><tr><th>Выбрано</th><th className="r">«2+1»</th><th className="r">Цена</th><th className="r">«1+1»</th><th className="r">Цена</th></tr></thead>
          <tbody>{Array.from({ length: 12 }, (_, i) => i + 1).map(T => { const a = plantQuote(pr, T, false), b = plantQuote(pr, T, true); return (
            <tr key={T}><td>{models(T)}</td><td className="r mono">{a.P} + {a.G}</td><td className="r">{rub(a.price)}{a.prov ? "*" : ""}</td><td className="r mono">{b.P} + {b.G}</td><td className="r">{rub(b.price)}{b.prov ? "*" : ""}</td></tr>); })}</tbody>
        </table></div>
        {pr.prov.length > 0 && <p className="note">* предварительная цена</p>}
      </section>
    </>
  );
}

export function AdminOrders() {
  const { s, byId, toast } = useStore();
  const os = s.orders.slice().sort((a, b) => b.date - a.date);
  const rev = os.reduce((a, o) => a + o.total, 0), tg = os.filter(o => o.ch === "tg").length;
  const nm = id => byId[id] ? byId[id].name : id;
  return (
    <>
      <div className="adm-h"><div><Eyebrow /><h1>Заказы</h1></div></div>
      <div className="stat-row">
        <div className="stat"><span>Заказов</span><b>{os.length}</b></div>
        <div className="stat"><span>Выручка</span><b>{rub(rev)}</b></div>
        <div className="stat"><span>Средний чек</span><b>{rub(os.length ? Math.round(rev / os.length) : 0)}</b></div>
        <div className="stat"><span>Через Telegram</span><b>{os.length ? Math.round(tg / os.length * 100) : 0}%</b></div>
      </div>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Заказ</th><th>Дата</th><th>Покупатель</th><th>Канал</th><th>Модели</th><th className="r">Сумма</th><th>Статус</th><th></th></tr></thead>
        <tbody>{os.map(o => (
          <tr key={o.id}>
            <td className="mono">{o.id}</td>
            <td style={{ whiteSpace: "nowrap" }}>{new Date(o.date).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
            <td>{o.tg || o.email}{o.tg && <div className="meta">{o.email}</div>}</td>
            <td><span className="ch">{o.ch === "tg" ? "Telegram" : "Сайт"}</span></td>
            <td title={o.items.map(nm).join(", ")}>{models(o.items.length)}<div className="meta">{o.items.slice(0, 2).map(nm).join(", ")}{o.items.length > 2 ? "…" : ""}</div></td>
            <td className="r">{rub(o.total)}</td>
            <td><span className="status-pill">Оплачен</span><div className="meta">чек отправлен</div></td>
            <td className="r"><button type="button" className="mini-btn" onClick={() => toast(o.ch === "tg" ? `Бот повторно отправил ссылки ${o.tg} в Telegram` : `Ссылки повторно отправлены на ${o.email}`)}>Отправить ссылки ещё раз</button></td>
          </tr>))}</tbody>
      </table></div>
      <p className="note">Заказы с пометкой «пример» вымышленные. Чеки формирует онлайн-касса сразу после оплаты, отправлять их вручную не нужно.</p>
    </>
  );
}
