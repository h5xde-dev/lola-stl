"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, BadgePercent, ChevronDown, Cloud, CloudOff, FolderTree, Layers, LayoutGrid, LogOut, Mail, Plus, ReceiptText, Sparkles } from "lucide-react";
import ModelArt from "./ModelArt";
import { Brand } from "./Shell";
import { api, useStore } from "./Store";
import { uploadModelFile } from "./uploader";
import { categoryHref, kindName, slugify } from "@/lib/models";
import { listPrice, paidPrice, plantQuote, quote, today } from "@/lib/pricing";
import { fmtDay, fmtSize, models, rub, zipMb } from "@/lib/format";

const live = s => s.models.filter(m => !m.deleted);

const SYNC = ["categories", "models", "promoCodes", "bundles", "prices", "promo", "promoAuto", "promoStart", "promoEnd", "loyalty", "downloadLimit"];

function AdminLogin({ onDone }) {
  const [pw, setPw] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr("");
    const { ok, data } = await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password: pw }) });
    setBusy(false);
    if (ok) onDone(); else setErr(data.error || "Не получилось войти");
  };
  return (
    <div className="inner-page"><form className="checkout-form" style={{ maxWidth: 380, margin: "60px auto" }} onSubmit={submit}>
      <Brand sub="АДМИН-ПАНЕЛЬ" />
      <label className="form-label">Пароль<input type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} autoFocus /></label>
      {err && <span className="err">{err}</span>}
      <button type="submit" className="button button-dark full" disabled={busy || !pw}>{busy ? "Входим…" : "Войти"}</button>
      <p className="note">Пароль задаётся переменной ADMIN_PASSWORD в настройках сервера.</p>
    </form></div>
  );
}

export function AdminShell({ children }) {
  const { s, promo, cats, admin, loadAdmin, toast } = useStore();
  const path = usePathname();
  const [auth, setAuth] = useState("loading");
  const [save, setSave] = useState("ok");
  const snap = useRef(null);
  useEffect(() => { loadAdmin().then(st => setAuth(st === 200 ? "ok" : st === 401 ? "login" : "error")); }, [loadAdmin]);

  // Автосохранение: всё, что изменилось после загрузки из базы, через 0,7 с уходит на сервер.
  useEffect(() => {
    if (!admin) return;
    const cur = Object.fromEntries(SYNC.map(k => [k, JSON.stringify(s[k] ?? null)]));
    if (!snap.current || snap.current.at !== admin.loadedAt) { snap.current = { at: admin.loadedAt, json: cur }; return; }
    const changed = SYNC.filter(k => cur[k] !== snap.current.json[k]);
    if (!changed.length) return;
    setSave("saving");
    const t = setTimeout(async () => {
      const { ok, data } = await api("/api/admin/state", { method: "PUT", body: JSON.stringify(Object.fromEntries(changed.map(k => [k, s[k]]))) });
      if (ok) { changed.forEach(k => { snap.current.json[k] = cur[k]; }); setSave("ok"); }
      else { setSave("error"); toast(data.error || "Не получилось сохранить изменения"); if (data && ok === false && data.error?.includes("вход")) setAuth("login"); }
    }, 700);
    return () => clearTimeout(t);
  }, [s, admin, toast]);

  if (auth === "loading") return <div className="inner-page"><div className="skeleton" aria-busy="true">Загружаем данные…</div></div>;
  if (auth === "login") return <AdminLogin onDone={() => loadAdmin().then(st => setAuth(st === 200 ? "ok" : "login"))} />;
  if (auth === "error") return <div className="inner-page"><div className="empty-state">Сервер не ответил. Обновите страницу через минуту.</div></div>;

  const tab = ["prices", "orders", "categories", "promo", "bundles", "outbox"].find(t => path.startsWith("/admin/" + t)) || "models";
  const link = (href, Icon, t, n, k) => <Link href={href} aria-current={tab === k ? "page" : undefined}><Icon size={17} aria-hidden="true" /><span>{t}</span><small>{n}</small></Link>;
  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <Brand sub="АДМИН-ПАНЕЛЬ" href="/admin" />
        <nav aria-label="Разделы админки">
          {link("/admin", LayoutGrid, "Модели", live(s).length, "models")}
          {link("/admin/categories", FolderTree, "Категории", cats.length, "categories")}
          {link("/admin/orders", ReceiptText, "Заказы", s.orders.length, "orders")}
          {link("/admin/prices", Sparkles, "Цены и акции", promo ? "1+1" : "2+1", "prices")}
          {link("/admin/promo", BadgePercent, "Промокоды", (s.promoCodes || []).filter(c => !c.deleted && c.active).length, "promo")}
          {link("/admin/bundles", Layers, "Наборы", (s.bundles || []).filter(b => !b.deleted && b.active).length, "bundles")}
          {link("/admin/outbox", Mail, "Письма", "", "outbox")}
        </nav>
        <div className={"save-state " + save} role="status">
          {save === "error" ? <><CloudOff size={14} /> Не сохранено</> : save === "saving" ? <><Cloud size={14} /> Сохраняем…</> : <><Cloud size={14} /> Всё сохранено</>}
        </div>
        <button type="button" className="back-store" style={{ border: 0, background: "none", cursor: "pointer", marginTop: 8 }} onClick={async () => { await api("/api/admin/logout", { method: "POST" }); location.reload(); }}><LogOut size={14} /> Выйти</button>
        <Link href="/" className="back-store" style={{ marginTop: 8 }}><ArrowLeft size={14} /> На сайт</Link>
      </aside>
      <section className="admin-main">{children}</section>
    </div>
  );
}

const Eyebrow = () => <span className="eyebrow">Магазин · управление</span>;

export function AdminModels() {
  const { s, set, toast, cats } = useStore();
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
              <td>{kindName(m, cats)}</td>
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

const newDraft = cats => ({ id: "u" + Date.now().toString(36), slug: "", name: "", category: cats[0]?.id, cat: cats[0]?.pricing || "plant", material: "", tags: [], n: 6, twist: 1, prof: "cone", color: "#9fc7b0", h: .6, r: .26, mb: 0, hidden: true, isNew: true, photos: [], dims: "", print: "", desc: "", custom: true });

export function AdminEditor({ id }) {
  const { s, set, byId, toast, cats, admin } = useStore();
  const router = useRouter();
  const isNew = id === "new";
  const [d, setD] = useState(() => isNew ? newDraft(cats) : byId[id] ? { photos: [], ...JSON.parse(JSON.stringify(byId[id])) } : null);
  const [err, setErr] = useState("");
  const [upload, setUpload] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const uploadJob = useRef(null);

  if (!d || d.deleted) return <div className="empty">Модель не найдена. <Link href="/admin">К списку</Link></div>;
  const upd = patch => setD(p => ({ ...p, ...patch }));
  const hasPh = d.photos && d.photos.length;

  // Загрузка STL/ZIP любого размера: частями прямо в хранилище (S3) или потоком на сервер.
  const startUpload = f => {
    if (!f) return;
    const t0 = Date.now();
    setUpload({ total: f.size / 1048576, done: 0, speed: 0 });
    const job = uploadModelFile({ file: f, modelId: d.id, storage: admin?.services?.storage,
      onProgress: (loaded, total) => setUpload(u => u && { ...u, total: total / 1048576, done: loaded / 1048576, speed: loaded / 1048576 / Math.max(1, (Date.now() - t0) / 1000) }) });
    uploadJob.current = job;
    job.promise.then(r => {
      setUpload(null);
      upd({ fileKey: r.key, mb: Math.max(1, Math.round((r.size || f.size) / 1048576)), file: f.name });
      toast("Файл загружен. Нажмите «Сохранить», чтобы модель получила новый файл.");
    }).catch(e => {
      setUpload(null);
      if (!e.aborted) toast(e.message === "network" ? "Связь оборвалась. Выберите тот же файл ещё раз — загрузка продолжится." : e.message);
    }).finally(() => { uploadJob.current = null; });
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
            <div className="f"><label htmlFor="fCat">Категория</label>
              <select id="fCat" value={d.category || ""} onChange={e => { const c = cats.find(x => x.id === e.target.value); if (c) upd({ category: c.id, cat: c.pricing, h: c.pricing === "box" ? .42 : .6, r: c.pricing === "box" ? .3 : .26 }); }}>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <small>{d.cat === "box" ? "Считается по ценам боксов, без подарков." : "Участвует в «2+1» и «1+1»."} <Link href="/admin/categories" className="text-link" style={{ fontSize: 12 }}>Категории</Link></small></div>
          </div>
          <div className="f"><label htmlFor="fDesc">Описание</label><textarea id="fDesc" value={d.desc} placeholder="Пара предложений о модели. Попадает в поиск Яндекса и Google." onChange={e => upd({ desc: e.target.value })} /></div>
          <div className="fgrid">
            <div className="f"><label htmlFor="fDims">Размер после печати</label><input type="text" id="fDims" value={d.dims} placeholder="120 × 120 × 118 мм" onChange={e => upd({ dims: e.target.value })} /></div>
            <div className="f"><label htmlFor="fPrint">Настройки печати</label><input type="text" id="fPrint" value={d.print} placeholder="режим вазы, сопло 0,6 мм" onChange={e => upd({ print: e.target.value })} /></div>
            <div className="f"><label htmlFor="fMat">Пластик</label><input type="text" id="fMat" value={d.material || ""} placeholder="шёлковый PLA" onChange={e => upd({ material: e.target.value })} /></div>
            <div className="f"><label htmlFor="fTags">Метки для поиска</label><input type="text" id="fTags" value={(d.tags || []).join(", ")} placeholder="щупальца, рассада" onChange={e => upd({ tags: e.target.value.split(",").map(t => t.trim().toLowerCase()).filter(Boolean) })} /><small>Через запятую. Ищутся в каталоге и попадают в описание для поисковиков.</small></div>
            <div className="f"><label htmlFor="fSlug">Адрес страницы</label><input type="text" id="fSlug" value={d.slug} placeholder={slugify(d.name || "model")} onChange={e => upd({ slug: slugify(e.target.value) })} /><small>/models/{d.slug || slugify(d.name || "model")}</small></div>
          </div>
          <div className="f"><span className="lbl">STL-файл</span>
            <div className="drop">
              {upload ? <>
                <div className="prog"><i style={{ width: Math.round(upload.done / Math.max(upload.total, .001) * 100) + "%" }} /></div>
                <span className="mono" style={{ fontSize: 12, color: "var(--ink)" }}>
                  {Math.round(upload.done)} из {Math.round(upload.total)} МБ · {upload.speed ? upload.speed.toFixed(1) + " МБ/с" : "…"}
                  {upload.speed > 0 && upload.total > upload.done ? ` · осталось ~${Math.max(1, Math.round((upload.total - upload.done) / upload.speed / 60))} мин` : ""}</span>
                <small>{admin?.services?.storage === "s3" ? "Файл уходит частями прямо в хранилище. Если связь оборвётся или вкладку закроют, выберите тот же файл ещё раз — загрузка продолжится." : "Не закрывайте страницу до конца загрузки."}</small>
                <button type="button" className="mini-btn" onClick={() => uploadJob.current?.cancel()}>Отменить загрузку</button>
              </> : <>
                {d.mb ? <><span className="mono" style={{ fontSize: 13, color: "var(--ink)" }}>{d.file || (d.slug || "model") + ".stl"} · {d.mb} МБ</span><span>Покупатель получит ZIP ≈ {zipMb(d)} МБ.</span></>
                  : <span>Файл не загружен. Без файла модель нельзя показать в каталоге.</span>}
                <label className="mini-btn" htmlFor="stlIn">{d.mb ? "Заменить файл" : "Выбрать STL или ZIP"}</label>
                <input type="file" id="stlIn" accept=".stl,.zip" hidden onChange={e => { startUpload(e.target.files?.[0]); e.target.value = ""; }} />
                <small>{admin?.services?.storage === "s3" ? "STL или ZIP до 5 ГБ: загружается частями напрямую в закрытое хранилище." : "Хранилище S3 не подключено: файл до 5 ГБ сохраняется на диск сервера сайта."}</small>
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
      <section className="panel"><h2>Скидка постоянным и скачивания</h2>
        <p className="panel-sub">Скидка действует со второго оплаченного заказа того же email или Telegram-аккаунта. С промокодом не суммируется: покупатель получает большую из двух. На наборы не действует.</p>
        <div className="actions">
          <label className="switch"><input type="checkbox" checked={!!s.loyalty?.on} onChange={e => set(p => ({ loyalty: { ...p.loyalty, on: e.target.checked } }))} /><span className="track" />Скидка постоянным</label>
        </div>
        <div className="price-grid">
          <PriceCell onSave={(k, v) => { const n = Math.round(Number(v)); if (!(n > 0 && n < 100)) { toast("Процент от 1 до 99"); return false; } set(p => ({ loyalty: { ...p.loyalty, percent: n } })); toast("Скидка сохранена"); return true; }}
            k="loyalty" label="Скидка, %" val={s.loyalty?.percent || 10} />
          <PriceCell onSave={(k, v) => { const n = Math.round(Number(v)); if (!(n >= 1 && n <= 50)) { toast("Лимит от 1 до 50"); return false; } set({ downloadLimit: n }); toast("Лимит сохранён"); return true; }}
            k="dl" label="Скачиваний на модель" val={s.downloadLimit || 5} />
        </div>
        <p className="note">Ссылка на файл действует 5 минут и работает только у покупателя. Если по заказу скачивают из многих мест сразу, заказ встаёт «на проверку» — его видно в разделе «Заказы».</p>
      </section>
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

const ORDER_ST = { paid: ["Оплачен", ""], review: ["На проверке", "warn"], revoked: ["Доступ закрыт", "off"], refunded: ["Возврат", "off"] };

export function AdminOrders() {
  const { s, byId, toast, loadAdmin, admin } = useStore();
  const [open, setOpen] = useState(null);
  const limit = s.downloadLimit || 5;
  const os = s.orders.slice().sort((a, b) => b.date - a.date);
  const rev = os.filter(o => o.status !== "refunded").reduce((a, o) => a + o.total, 0), tg = os.filter(o => o.ch === "tg").length;
  const nm = id => byId[id] ? byId[id].name : id;
  const act = async (id, action, msg) => {
    const { ok, data } = await api(`/api/admin/orders/${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify({ action }) });
    toast(ok ? msg : data.error || "Не получилось");
    if (ok) await loadAdmin();
  };
  return (
    <>
      <div className="adm-h"><div><Eyebrow /><h1>Заказы</h1></div>{admin?.pendingOrders > 0 && <span className="meta">ждут оплаты: {admin.pendingOrders}</span>}</div>
      <div className="stat-row">
        <div className="stat"><span>Заказов</span><b>{os.length}</b></div>
        <div className="stat"><span>Выручка</span><b>{rub(rev)}</b></div>
        <div className="stat"><span>Средний чек</span><b>{rub(os.length ? Math.round(rev / os.length) : 0)}</b></div>
        <div className="stat"><span>Через Telegram</span><b>{os.length ? Math.round(tg / os.length * 100) : 0}%</b></div>
      </div>
      {!os.length ? <div className="empty-state">Заказов пока нет. Они появятся здесь сразу после первой оплаты.</div> :
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Заказ</th><th>Дата</th><th>Покупатель</th><th>Модели</th><th className="r">Сумма</th><th>Скидка</th><th>Доступ</th><th></th></tr></thead>
        <tbody>{os.map(o => {
          const st = ORDER_ST[o.status || "paid"], used = Object.values(o.downloads || {}).reduce((a, b) => a + b, 0);
          return [
            <tr key={o.id}>
              <td className="mono">{o.id}<div className="meta"><span className="ch">{o.ch === "tg" ? "Telegram" : "Сайт"}</span></div></td>
              <td style={{ whiteSpace: "nowrap" }}>{new Date(o.date).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
              <td>{o.tg || o.email}{o.tg && <div className="meta">{o.email}</div>}</td>
              <td title={o.items.map(nm).join(", ")}>{models(o.items.length)}<div className="meta">{(o.sets || []).length ? `набор: ${o.sets.join(", ")}` : o.items.slice(0, 2).map(nm).join(", ") + (o.items.length > 2 ? "…" : "")}</div></td>
              <td className="r">{rub(o.total)}</td>
              <td>{o.discount ? <>{o.discount.label}<div className="meta">−{rub(o.discount.amount)}</div></> : <span className="meta">—</span>}</td>
              <td><span className={"status-pill " + st[1]}>{st[0]}</span><div className="meta">скачано {used} раз</div></td>
              <td className="r"><button type="button" className="mini-btn" aria-expanded={open === o.id} onClick={() => setOpen(open === o.id ? null : o.id)}>Подробнее <ChevronDown size={13} /></button></td>
            </tr>,
            open === o.id && <tr key={o.id + "-d"} className="order-detail"><td colSpan={8}>
              <div className="od-grid">
                <div>
                  <b className="od-h">Позиции чека</b>
                  <table className="tbl compact"><tbody>{(o.lines || o.items.map(id => ({ id, price: 0 }))).map((l, i) => (
                    <tr key={i}><td>{nm(l.id)}{l.set ? <span className="meta"> · набор</span> : l.gift ? <span className="meta"> · подарок</span> : null}</td>
                      <td className="r">{rub(l.price)}</td><td className="r meta">скачано {(o.downloads || {})[l.id] || 0} из {limit}</td></tr>))}</tbody></table>
                </div>
                <div>
                  <b className="od-h">Журнал скачиваний</b>
                  {(o.log || []).length ? <ul className="od-log">{o.log.slice(-8).reverse().map((e, i) => (
                    <li key={i}><span className="mono">{new Date(e.at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span> · {nm(e.id)} · {e.ip}<div className="meta">{e.ua}</div></li>))}</ul>
                    : <p className="meta">Ещё не скачивали.</p>}
                  <div className="actions" style={{ marginTop: 10 }}>
                    <button type="button" className="mini-btn" onClick={() => act(o.id, "reset", "Лимит скачиваний сброшен")}>Сбросить лимит</button>
                    {o.status === "review" || o.status === "revoked"
                      ? <button type="button" className="mini-btn" onClick={() => act(o.id, "open", "Доступ открыт")}>Открыть доступ</button>
                      : <button type="button" className="mini-btn" onClick={() => act(o.id, "review", "Заказ на проверке: скачивание приостановлено")}>На проверку</button>}
                    {o.status !== "revoked" && <button type="button" className="mini-btn" style={{ color: "var(--danger)" }} onClick={() => act(o.id, "revoke", "Доступ к файлам закрыт")}>Закрыть доступ</button>}
                    <button type="button" className="mini-btn" onClick={() => act(o.id, "resend", "Новая ссылка на покупки отправлена")}>Отправить ссылку ещё раз</button>
                  </div>
                </div>
              </div>
            </td></tr>,
          ];
        })}</tbody>
      </table></div>}
      <p className="note">Чеки формирует онлайн-касса сразу после оплаты. Сумма в чеке разложена по моделям: подарочные тоже получают долю, поэтому частичный возврат считается точно.</p>
    </>
  );
}

// ---------- Категории ----------
const blankCat = () => ({ id: "c-" + Date.now().toString(36), slug: "", name: "", single: "", gen: "", pricing: "plant", inMenu: true, desc: "", custom: true });

export function AdminCategories() {
  const { s, set, cats, toast } = useStore();
  const [edit, setEdit] = useState(null);   // черновик категории
  const [err, setErr] = useState("");
  const [del, setDel] = useState(null);     // { id, to }
  const count = id => s.models.filter(m => m.category === id && !m.deleted).length;

  const upd = patch => setEdit(p => ({ ...p, ...patch }));
  const startNew = () => { setErr(""); setDel(null); setEdit(blankCat()); };
  const save = () => {
    const name = (edit.name || "").trim();
    if (!name) { setErr("Укажите название: оно видно в меню и на странице категории."); return; }
    let slug = edit.slug || slugify(name);
    const taken = new Set((s.categories || []).filter(c => c.id !== edit.id && !c.deleted).map(c => c.slug));
    for (let i = 2; taken.has(slug); i++) slug = slugify(name) + "-" + i;
    const single = (edit.single || "").trim() || name;
    const next = { ...edit, name, slug, single, gen: (edit.gen || "").trim() || single.toLowerCase() };
    const exists = (s.categories || []).some(c => c.id === next.id);
    if (!exists) next.order = Math.max(0, ...cats.map(c => c.order || 0)) + 1;
    set(p => ({
      categories: exists ? p.categories.map(c => c.id === next.id ? next : c) : [...p.categories, next],
      // ценовая группа моделей следует за категорией
      models: p.models.map(m => m.category === next.id ? { ...m, cat: next.pricing } : m),
    }));
    setEdit(null);
    toast(exists ? "Категория сохранена" : `Категория «${name}» добавлена`);
  };
  const move = (id, dir) => {
    const list = cats.map(c => c.id), i = list.indexOf(id), j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    set(p => ({ categories: p.categories.map(c => ({ ...c, order: list.indexOf(c.id) + 1 })) }));
  };
  const remove = () => {
    const c = cats.find(x => x.id === del.id), n = count(c.id), to = cats.find(x => x.id === del.to);
    if (n && !to) { toast("Выберите, куда перенести модели"); return; }
    set(p => ({
      categories: p.categories.map(x => x.id === c.id ? { ...x, deleted: true } : x),
      models: n ? p.models.map(m => m.category === c.id ? { ...m, category: to.id, cat: to.pricing } : m) : p.models,
    }));
    setDel(null); setEdit(null);
    toast(n ? `Категория удалена, ${models(n)} перенесено в «${to.name}»` : "Категория удалена");
  };

  return (
    <>
      <div className="adm-h"><div><Eyebrow /><h1>Категории</h1></div>
        <button type="button" className="button button-dark" onClick={startNew}><Plus size={16} /> Добавить категорию</button></div>
      <p className="panel-sub">Категории видны в меню сайта и фильтрах каталога, у каждой своя страница для поисковиков. Порядок в меню меняется стрелками.</p>

      {edit && (
        <section className="panel" aria-label="Категория">
          <h2>{(s.categories || []).some(c => c.id === edit.id) ? "Изменить категорию" : "Новая категория"}</h2>
          <div className="fgrid">
            <div className="f"><label htmlFor="cName">Название в меню</label><input type="text" id="cName" value={edit.name} placeholder="Лотки для рассады" onChange={e => upd({ name: e.target.value })} />{err && <span className="err">{err}</span>}</div>
            <div className="f"><label htmlFor="cSingle">На карточке модели</label><input type="text" id="cSingle" value={edit.single} placeholder={edit.name || "Лоток для рассады"} onChange={e => upd({ single: e.target.value })} /></div>
            <div className="f"><label htmlFor="cGen">В заголовке «STL-модель …»</label><input type="text" id="cGen" value={edit.gen} placeholder="лотка для рассады" onChange={e => upd({ gen: e.target.value })} /><small>Для поисковиков: «Лоток «Капли» — STL-модель лотка для рассады».</small></div>
          </div>
          <div className="fgrid">
            <div className="f"><label htmlFor="cPricing">Цены</label>
              <select id="cPricing" value={edit.pricing} onChange={e => upd({ pricing: e.target.value })}>
                <option value="plant">Как кашпо: «2+1» и «1+1»</option>
                <option value="box">Как боксы: отдельные цены, без подарков</option>
              </select></div>
            <div className="f"><label htmlFor="cSlug">Адрес страницы</label><input type="text" id="cSlug" value={edit.slug} placeholder={slugify(edit.name || "category")} onChange={e => upd({ slug: slugify(e.target.value) })} /><small>/category/{edit.slug || slugify(edit.name || "category")}</small></div>
          </div>
          <div className="f"><label htmlFor="cDesc">Описание для страницы категории</label><textarea id="cDesc" value={edit.desc} placeholder="Пара предложений: что за модели, для чего, как печатаются. Попадает в поиск." onChange={e => upd({ desc: e.target.value })} /></div>
          <div className="actions">
            <label className="check"><input type="checkbox" checked={!!edit.inMenu} onChange={e => upd({ inMenu: e.target.checked })} /><span>Показывать в меню сайта</span></label>
          </div>
          <div className="actions">
            <button type="button" className="btn primary" onClick={save}>Сохранить</button>
            <button type="button" className="btn" onClick={() => setEdit(null)}>Отмена</button>
          </div>
        </section>
      )}

      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Порядок</th><th>Категория</th><th>Цены</th><th className="r">Моделей</th><th>В меню</th><th></th></tr></thead>
        <tbody>{cats.map((c, i) => (
          <tr key={c.id}>
            <td><div style={{ display: "flex", gap: 4 }}>
              <button type="button" className="mini-btn" disabled={!i} aria-label={`Поднять «${c.name}»`} onClick={() => move(c.id, -1)}><ArrowUp size={14} /></button>
              <button type="button" className="mini-btn" disabled={i === cats.length - 1} aria-label={`Опустить «${c.name}»`} onClick={() => move(c.id, 1)}><ArrowDown size={14} /></button></div></td>
            <td><b>{c.name}</b><div className="meta"><Link href={categoryHref(c)} className="text-link" style={{ fontSize: 12 }}>/category/{c.slug}</Link></div></td>
            <td>{c.pricing === "box" ? "Как боксы" : "2+1 и 1+1"}</td>
            <td className="r">{count(c.id)}</td>
            <td><label className="switch"><input type="checkbox" checked={!!c.inMenu} aria-label={`Показывать «${c.name}» в меню`}
              onChange={e => set(p => ({ categories: p.categories.map(x => x.id === c.id ? { ...x, inMenu: e.target.checked } : x) }))} /><span className="track" /></label></td>
            <td className="r"><div style={{ display: "inline-flex", gap: 6 }}>
              <button type="button" className="mini-btn" onClick={() => { setErr(""); setDel(null); setEdit({ ...c }); }}>Изменить</button>
              <button type="button" className="mini-btn" style={{ color: "var(--danger)" }} onClick={() => { setEdit(null); setDel({ id: c.id, to: "" }); }}>Удалить</button></div></td>
          </tr>))}</tbody>
      </table></div>

      {del && (() => {
        const c = cats.find(x => x.id === del.id), n = count(del.id);
        return (
          <div className="confirm">
            <span>{n ? `В категории «${c.name}» ${models(n)}. Куда их перенести?` : `Удалить пустую категорию «${c.name}»?`}</span>
            {n > 0 && <select value={del.to} onChange={e => setDel({ ...del, to: e.target.value })} className="search" style={{ width: "auto" }} aria-label="Куда перенести модели">
              <option value="">Выберите категорию</option>
              {cats.filter(x => x.id !== c.id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>}
            <button type="button" className="btn danger" onClick={remove}>Удалить</button>
            <button type="button" className="btn" onClick={() => setDel(null)}>Оставить</button>
          </div>
        );
      })()}
      <p className="note">Пустые категории не показываются в меню и фильтрах сайта, пока в них нет моделей.</p>
    </>
  );
}

// ---------- Промокоды ----------
const blankCode = () => ({ id: "pc-" + Date.now().toString(36), code: "", type: "percent", value: 10, active: true, from: "", to: "", maxUses: 0, once: true, minTotal: 0, category: "", firstOnly: false, duringPromo: false, note: "" });

export function AdminPromo() {
  const { s, set, cats, toast } = useStore();
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState("");
  const list = (s.promoCodes || []).filter(c => !c.deleted);
  const uses = code => s.orders.filter(o => o.code && o.code.toUpperCase() === code.toUpperCase()).length;
  const upd = patch => setEdit(p => ({ ...p, ...patch }));
  const state = c => !c.active ? ["выключен", "off"] : c.to && today() > c.to ? ["истёк", "off"] : c.from && today() < c.from ? ["ещё не начался", "warn"] : c.maxUses && uses(c.code) >= c.maxUses ? ["закончился", "off"] : ["действует", ""];
  const save = () => {
    const code = (edit.code || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!/^[A-ZА-ЯЁ0-9_-]{3,20}$/.test(code)) { setErr("Код: 3–20 букв, цифр, «-» или «_»."); return; }
    if (list.some(c => c.id !== edit.id && c.code === code)) { setErr("Такой код уже есть."); return; }
    const v = Number(edit.value);
    if (!(v > 0) || (edit.type === "percent" && v >= 100)) { setErr(edit.type === "percent" ? "Процент от 1 до 99." : "Сумма больше нуля."); return; }
    const next = { ...edit, code, value: v, maxUses: Number(edit.maxUses) || 0, minTotal: Number(edit.minTotal) || 0 };
    set(p => ({ promoCodes: (p.promoCodes || []).some(c => c.id === next.id) ? p.promoCodes.map(c => c.id === next.id ? next : c) : [...(p.promoCodes || []), next] }));
    setEdit(null); toast(`Промокод ${code} сохранён`);
  };
  return (
    <>
      <div className="adm-h"><div><Eyebrow /><h1>Промокоды</h1></div>
        <button type="button" className="button button-dark" onClick={() => { setErr(""); setEdit(blankCode()); }}><Plus size={16} /> Добавить промокод</button></div>
      <p className="panel-sub">Скидка по коду считается после подарков «2+1» / «1+1», на наборы не действует. С скидкой постоянного покупателя не суммируется — применяется большая.</p>
      {edit && (
        <section className="panel" aria-label="Промокод">
          <h2>{list.some(c => c.id === edit.id) ? `Промокод ${edit.code}` : "Новый промокод"}</h2>
          <div className="fgrid">
            <div className="f"><label htmlFor="pcCode">Код</label><input type="text" id="pcCode" value={edit.code} placeholder="LOLA10" onChange={e => upd({ code: e.target.value.toUpperCase() })} />{err && <span className="err">{err}</span>}</div>
            <div className="f"><label htmlFor="pcType">Скидка</label>
              <select id="pcType" value={edit.type} onChange={e => upd({ type: e.target.value })}><option value="percent">Процент</option><option value="fixed">Сумма в рублях</option></select></div>
            <div className="f"><label htmlFor="pcVal">{edit.type === "percent" ? "Процент" : "Сумма, ₽"}</label><input type="text" inputMode="numeric" id="pcVal" value={edit.value} onChange={e => upd({ value: e.target.value.replace(/[^0-9]/g, "") })} /></div>
          </div>
          <div className="fgrid">
            <div className="f"><label htmlFor="pcFrom">Действует с</label><input type="date" id="pcFrom" value={edit.from} onChange={e => upd({ from: e.target.value })} /><small>Пусто — сразу</small></div>
            <div className="f"><label htmlFor="pcTo">По (включительно)</label><input type="date" id="pcTo" value={edit.to} onChange={e => upd({ to: e.target.value })} /><small>Пусто — бессрочно</small></div>
            <div className="f"><label htmlFor="pcMax">Всего использований</label><input type="text" inputMode="numeric" id="pcMax" value={edit.maxUses || ""} placeholder="без лимита" onChange={e => upd({ maxUses: e.target.value.replace(/[^0-9]/g, "") })} /></div>
            <div className="f"><label htmlFor="pcMin">Заказ от, ₽</label><input type="text" inputMode="numeric" id="pcMin" value={edit.minTotal || ""} placeholder="любой" onChange={e => upd({ minTotal: e.target.value.replace(/[^0-9]/g, "") })} /></div>
            <div className="f"><label htmlFor="pcCat">Только для категории</label>
              <select id="pcCat" value={edit.category} onChange={e => upd({ category: e.target.value })}><option value="">Все модели</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div className="f"><label htmlFor="pcNote">Заметка для себя</label><input type="text" id="pcNote" value={edit.note || ""} placeholder="Для подписчиков канала" onChange={e => upd({ note: e.target.value })} /></div>
          <div className="actions">
            <label className="check"><input type="checkbox" checked={!!edit.once} onChange={e => upd({ once: e.target.checked })} /><span>Один раз на покупателя</span></label>
            <label className="check"><input type="checkbox" checked={!!edit.firstOnly} onChange={e => upd({ firstOnly: e.target.checked })} /><span>Только первый заказ</span></label>
            <label className="check"><input type="checkbox" checked={!!edit.duringPromo} onChange={e => upd({ duringPromo: e.target.checked })} /><span>Действует во время «1+1»</span></label>
            <label className="check"><input type="checkbox" checked={!!edit.active} onChange={e => upd({ active: e.target.checked })} /><span>Включён</span></label>
          </div>
          <div className="actions"><button type="button" className="btn primary" onClick={save}>Сохранить</button><button type="button" className="btn" onClick={() => setEdit(null)}>Отмена</button></div>
        </section>
      )}
      {!list.length ? <div className="empty-state">Промокодов пока нет.</div> :
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Код</th><th>Скидка</th><th>Условия</th><th className="r">Использован</th><th>Статус</th><th></th></tr></thead>
        <tbody>{list.map(c => { const [t, cls] = state(c); return (
          <tr key={c.id}>
            <td><b className="mono" style={{ fontFamily: "var(--f-mono)" }}>{c.code}</b>{c.note && <div className="meta">{c.note}</div>}</td>
            <td>{c.type === "percent" ? `−${c.value}%` : `−${rub(c.value)}`}</td>
            <td className="meta">{[c.from && `с ${fmtDay(c.from)}`, c.to && `по ${fmtDay(c.to)}`, c.minTotal && `от ${rub(c.minTotal)}`, c.category && `«${cats.find(x => x.id === c.category)?.name || "?"}»`, c.once && "1 раз на покупателя", c.firstOnly && "первый заказ", c.duringPromo && "и во время 1+1"].filter(Boolean).join(" · ") || "без условий"}</td>
            <td className="r">{uses(c.code)}{c.maxUses ? ` из ${c.maxUses}` : ""}</td>
            <td><span className={"status-pill " + cls}>{t}</span></td>
            <td className="r"><div style={{ display: "inline-flex", gap: 6 }}>
              <button type="button" className="mini-btn" onClick={() => { setErr(""); setEdit({ ...c }); }}>Изменить</button>
              <button type="button" className="mini-btn" style={{ color: "var(--danger)" }} onClick={() => { set(p => ({ promoCodes: p.promoCodes.map(x => x.id === c.id ? { ...x, deleted: true } : x) })); toast(`Промокод ${c.code} удалён`); }}>Удалить</button></div></td>
          </tr>); })}</tbody>
      </table></div>}
    </>
  );
}

// ---------- Наборы ----------
const blankSet = () => ({ id: "s-" + Date.now().toString(36), name: "", desc: "", items: [], price: 0, active: true });

export function AdminBundles() {
  const { s, set, byId, toast } = useStore();
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState("");
  const list = (s.bundles || []).filter(b => !b.deleted);
  const all = s.models.filter(m => !m.deleted && !m.hidden);
  // Сколько стоили бы те же модели по обычным правилам — для сравнения
  const regular = items => quote({ ...s, cart: items, bundles: [], code: "", loyalty: { on: false }, orders: [] }, byId).total;
  const upd = patch => setEdit(p => ({ ...p, ...patch }));
  const save = () => {
    const name = (edit.name || "").trim();
    if (!name) { setErr("Укажите название набора."); return; }
    if (edit.items.length < 2) { setErr("В наборе должно быть хотя бы 2 модели."); return; }
    const price = Number(edit.price);
    if (!(price > 0)) { setErr("Укажите цену набора."); return; }
    const next = { ...edit, name, price };
    set(p => ({ bundles: (p.bundles || []).some(b => b.id === next.id) ? p.bundles.map(b => b.id === next.id ? next : b) : [...(p.bundles || []), next] }));
    setEdit(null); toast(`Набор «${name}» сохранён`);
  };
  return (
    <>
      <div className="adm-h"><div><Eyebrow /><h1>Наборы</h1></div>
        <button type="button" className="button button-dark" onClick={() => { setErr(""); setEdit(blankSet()); }}><Plus size={16} /> Добавить набор</button></div>
      <p className="panel-sub">Набор — несколько моделей по фиксированной цене. Его модели не участвуют в «2+1», промокоды на набор не действуют. Если часть моделей покупатель уже купил, цена набора уменьшается пропорционально.</p>
      {edit && (
        <section className="panel" aria-label="Набор">
          <h2>{list.some(b => b.id === edit.id) ? `Набор «${edit.name}»` : "Новый набор"}</h2>
          <div className="fgrid">
            <div className="f"><label htmlFor="bName">Название</label><input type="text" id="bName" value={edit.name} placeholder="Неоновая серия" onChange={e => upd({ name: e.target.value })} />{err && <span className="err">{err}</span>}</div>
            <div className="f"><label htmlFor="bPrice">Цена набора, ₽</label><input type="text" inputMode="numeric" id="bPrice" value={edit.price || ""} onChange={e => upd({ price: e.target.value.replace(/[^0-9]/g, "") })} />
              {edit.items.length > 1 && <small>Без набора по «2+1»: {rub(regular(edit.items))}{edit.price && +edit.price >= regular(edit.items) ? " — набор не выгоднее, покупатели его не возьмут" : edit.price ? ` — выгода ${rub(regular(edit.items) - edit.price)}` : ""}</small>}</div>
          </div>
          <div className="f"><label htmlFor="bDesc">Описание</label><textarea id="bDesc" value={edit.desc} placeholder="Что объединяет модели" onChange={e => upd({ desc: e.target.value })} /></div>
          <div className="f"><span className="lbl">Модели в наборе · {edit.items.length}</span>
            <div className="pick-grid">{all.map(m => (
              <label key={m.id} className={"pick" + (edit.items.includes(m.id) ? " on" : "")}>
                <input type="checkbox" checked={edit.items.includes(m.id)} onChange={e => upd({ items: e.target.checked ? [...edit.items, m.id] : edit.items.filter(x => x !== m.id) })} />
                <span className="pick-art"><ModelArt m={m} uid={"pk-" + m.id} sizes="60px" /></span><span>{m.name}</span>
              </label>))}</div></div>
          <div className="actions"><label className="check"><input type="checkbox" checked={!!edit.active} onChange={e => upd({ active: e.target.checked })} /><span>Показывать в каталоге</span></label></div>
          <div className="actions"><button type="button" className="btn primary" onClick={save}>Сохранить</button><button type="button" className="btn" onClick={() => setEdit(null)}>Отмена</button></div>
        </section>
      )}
      {!list.length ? <div className="empty-state">Наборов пока нет.</div> :
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Набор</th><th>Модели</th><th className="r">Цена</th><th className="r">Без набора</th><th className="r">Продано</th><th>В каталоге</th><th></th></tr></thead>
        <tbody>{list.map(b => (
          <tr key={b.id}>
            <td><b>{b.name}</b>{b.desc && <div className="meta">{b.desc}</div>}</td>
            <td className="meta">{b.items.map(id => byId[id]?.name).filter(Boolean).join(", ")}</td>
            <td className="r">{rub(b.price)}</td>
            <td className="r meta">{rub(regular(b.items))}</td>
            <td className="r">{s.orders.filter(o => (o.sets || []).includes(b.name)).length}</td>
            <td><label className="switch"><input type="checkbox" checked={!!b.active} aria-label={`Показывать «${b.name}»`} onChange={e => set(p => ({ bundles: p.bundles.map(x => x.id === b.id ? { ...x, active: e.target.checked } : x) }))} /><span className="track" /></label></td>
            <td className="r"><div style={{ display: "inline-flex", gap: 6 }}>
              <button type="button" className="mini-btn" onClick={() => { setErr(""); setEdit({ ...b, items: [...b.items] }); }}>Изменить</button>
              <button type="button" className="mini-btn" style={{ color: "var(--danger)" }} onClick={() => { set(p => ({ bundles: p.bundles.map(x => x.id === b.id ? { ...x, deleted: true } : x), cart: p.cart.filter(x => x !== "set:" + b.id) })); toast(`Набор «${b.name}» удалён`); }}>Удалить</button></div></td>
          </tr>))}</tbody>
      </table></div>}
    </>
  );
}

// ---------- Письма и сообщения ----------
export function AdminOutbox() {
  const { admin } = useStore();
  const [items, setItems] = useState(null);
  useEffect(() => { api("/api/admin/outbox").then(r => setItems(r.ok ? r.data.items : [])); }, []);
  const sv = admin?.services || {};
  const link = t => t.replace(/https?:\/\/\S+/g, u => `\u0000${u}\u0000`).split("\u0000");
  return (
    <>
      <div className="adm-h"><div><Eyebrow /><h1>Письма</h1></div></div>
      <section className="panel"><h2>Подключённые сервисы</h2>
        <div className="svc-grid">
          {[["Оплата", sv.payments === "yookassa" ? "ЮKassa" : sv.payments === "mock" ? "тестовая страница" : "не подключена", sv.payments === "yookassa"],
            ["Почта", sv.mail === "smtp" ? "SMTP" : "только журнал", sv.mail === "smtp"],
            ["Файлы", sv.storage === "s3" ? "S3-хранилище" : "папка на сервере", sv.storage === "s3"],
            ["Telegram-бот", sv.telegram ? "подключён" : "нет токена", sv.telegram],
            ["База", sv.db === "postgres" ? "PostgreSQL" : "встроенная (для проверки)", sv.db === "postgres"]].map(([t, v, on]) => (
            <div key={t} className="stat"><span>{t}</span><b className={"svc " + (on ? "on" : "")}>{v}</b></div>))}
        </div>
        <p className="panel-sub">Что подключить и где взять ключи — в README, раздел «Рабочий режим».</p>
      </section>
      <p className="panel-sub">Каждое письмо покупателю и сообщение бота. Пока почта не подключена, письма не уходят, но ссылки из них можно открыть отсюда.</p>
      {!items ? <div className="skeleton">Загрузка…</div> : !items.length ? <div className="empty-state">Писем пока не было.</div> :
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Когда</th><th>Кому</th><th>Тема и текст</th><th>Статус</th></tr></thead>
          <tbody>{items.map(m => (
            <tr key={m.id}>
              <td style={{ whiteSpace: "nowrap" }}>{new Date(m.at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
              <td>{m.recipient}<div className="meta">{m.channel === "telegram" ? "Telegram" : "email"}</div></td>
              <td style={{ whiteSpace: "pre-wrap", maxWidth: 520 }}>{m.subject && <b style={{ fontFamily: "var(--f-body)", fontWeight: 700, fontSize: 13 }}>{m.subject}<br /></b>}
                <span className="meta" style={{ whiteSpace: "pre-wrap" }}>{link(m.body).map((p, i) => /^https?:/.test(p) ? <a key={i} href={p} className="text-link" style={{ fontSize: 12 }} target="_blank" rel="noreferrer">{p.length > 60 ? p.slice(0, 60) + "…" : p}</a> : p)}</span></td>
              <td><span className={"status-pill " + (m.sent ? "" : "warn")}>{m.sent ? "отправлено" : "в журнале"}</span>{m.error && <div className="meta">{m.error}</div>}</td>
            </tr>))}</tbody>
        </table></div>}
    </>
  );
}
