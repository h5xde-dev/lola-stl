"use client";
// Разделы админки для содержимого сайта: главная, статьи, SEO и реквизиты, аналитика заказов.
// Изменения пишутся в общее состояние и сохраняются на сервер автоматически (как остальная админка).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, ImagePlus, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { api, useStore } from "./Store";
import { listImages, uploadImage } from "./media";
import { slugify } from "@/lib/models";
import { DEFAULT_HOME, mergeHome } from "@/lib/content";
import { Markdown, plainText } from "@/lib/md";
import { rub } from "@/lib/format";

const Eyebrow = ({ t = "Магазин · управление" }) => <span className="eyebrow">{t}</span>;
const todayIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow" }).format(new Date());

// ---------- SEO-поля для модели, категории, статьи ----------
export function SeoFields({ title, desc, onChange, idp, hintTitle, hintDesc }) {
  return (
    <details className="seo-box" open={!!(title || desc)}>
      <summary>SEO: заголовок и описание для поисковиков</summary>
      <div className="f"><label htmlFor={idp + "SeoT"}>Заголовок в поиске <small className="cnt">{(title || "").length}/60</small></label>
        <input id={idp + "SeoT"} type="text" value={title || ""} placeholder={hintTitle} onChange={e => onChange({ seoTitle: e.target.value })} />
        <small>Пусто — заголовок собирается сам. Оптимально до 60 символов.</small></div>
      <div className="f"><label htmlFor={idp + "SeoD"}>Описание в поиске <small className="cnt">{(desc || "").length}/160</small></label>
        <textarea id={idp + "SeoD"} rows={3} value={desc || ""} placeholder={hintDesc} onChange={e => onChange({ seoDesc: e.target.value })} />
        <small>Пусто — берётся описание. Оптимально 120–160 символов.</small></div>
    </details>
  );
}

// ---------- картинка: загрузить новую или выбрать из загруженных ----------
function MediaPicker({ onPick, onClose }) {
  const [items, setItems] = useState(null);
  useEffect(() => { listImages().then(setItems); }, []);
  return (
    <div className="media-picker" role="dialog" aria-label="Загруженные картинки">
      <div className="media-picker-h"><b>Загруженные картинки</b><button type="button" className="mini-btn" onClick={onClose}>Закрыть</button></div>
      {!items ? <p className="panel-sub">Загружаем…</p> : !items.length ? <p className="panel-sub">Пока ничего не загружено.</p> : (
        <div className="media-grid">{items.map(i => (
          <button type="button" key={i.src} onClick={() => { onPick(i.src); onClose(); }} aria-label="Выбрать картинку"><img src={i.src} alt="" loading="lazy" /></button>
        ))}</div>
      )}
    </div>
  );
}

export function ImageField({ value, onChange, label, idp, alt = true, hint }) {
  const { toast } = useStore();
  const [busy, setBusy] = useState(false), [pick, setPick] = useState(false);
  const v = value || {};
  const up = async f => {
    if (!f) return;
    setBusy(true);
    try { onChange({ ...v, src: await uploadImage(f) }); }
    catch (e) { toast(e.message); }
    setBusy(false);
  };
  return (
    <div className="f img-field">
      <span className="lbl">{label}</span>
      <div className="img-field-row">
        <div className="img-prev">{v.src ? <img src={v.src} alt="" /> : <ImagePlus size={20} aria-hidden="true" />}</div>
        <div className="img-field-ctl">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <label className="mini-btn" htmlFor={idp + "File"}>{busy ? "Загружаем…" : v.src ? "Заменить" : "Загрузить"}</label>
            <input id={idp + "File"} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { up(e.target.files?.[0]); e.target.value = ""; }} />
            <button type="button" className="mini-btn" onClick={() => setPick(!pick)}>Из загруженных</button>
          </div>
          {alt && <input type="text" aria-label={`${label}: описание картинки`} value={v.alt || ""} placeholder="Что на фото — для поисковиков и незрячих" onChange={e => onChange({ ...v, alt: e.target.value })} />}
          {hint && <small>{hint}</small>}
        </div>
      </div>
      {pick && <MediaPicker onPick={src => onChange({ ...v, src })} onClose={() => setPick(false)} />}
    </div>
  );
}

// ---------- главная ----------
export function AdminHome() {
  const { s, set, toast } = useStore();
  const h = mergeHome(s.home);
  const upd = patch => set(p => ({ home: { ...mergeHome(p.home), ...patch } }));
  const models = (s.models || []).filter(m => !m.deleted);
  const txt = (k, label, ph, area) => (
    <div className="f"><label htmlFor={"h" + k}>{label}</label>
      {area ? <textarea id={"h" + k} rows={3} value={h[k]} placeholder={ph} onChange={e => upd({ [k]: e.target.value })} />
        : <input id={"h" + k} type="text" value={h[k]} placeholder={ph} onChange={e => upd({ [k]: e.target.value })} />}</div>
  );
  const g = h.gallery;
  const setG = list => upd({ gallery: list });
  const move = (i, d) => { const l = [...g], j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setG(l); };
  return (
    <>
      <div className="adm-h"><div><Eyebrow /><h1>Главная страница</h1></div>
        <a href="/" target="_blank" rel="noopener" className="button button-outline"><ExternalLink size={16} /> Открыть главную</a></div>
      <p className="panel-sub">Изменения сохраняются автоматически и сразу видны на сайте. Фото уменьшаются до 2000 px и показываются посетителям в сжатом виде.</p>

      <section className="panel"><h2>Первый экран</h2>
        <div className="fgrid">{txt("kicker", "Надпись над заголовком", DEFAULT_HOME.kicker)}{txt("title", "Заголовок", DEFAULT_HOME.title)}{txt("titleEm", "Вторая строка (цветная)", DEFAULT_HOME.titleEm)}</div>
        {txt("text", "Текст под заголовком", DEFAULT_HOME.text, true)}
        <div className="fgrid">{txt("note", "Подпись у аватара", DEFAULT_HOME.note)}{txt("noteSmall", "Мелкий текст", DEFAULT_HOME.noteSmall)}</div>
        <div className="fgrid">
          {["Большое фото (арка)", "Маленькое слева", "Маленькое справа"].map((l, i) => (
            <ImageField key={i} idp={"hero" + i} label={l} value={h.hero[i]}
              onChange={v => upd({ hero: h.hero.map((x, j) => (j === i ? v : x)) })} hint={i ? "Вертикальное 3:4" : "Вертикальное, примерно 3:4"} />
          ))}
        </div>
      </section>

      <section className="panel"><h2>Галерея «Из мастерской»</h2>
        {txt("galleryTitle", "Заголовок блока", DEFAULT_HOME.galleryTitle)}
        <p className="panel-sub">Плитки идут в сетке по 4 в ряд: «высокая» занимает две строки, «широкая» — две колонки. Ссылка ведёт на модель при клике.</p>
        {g.map((it, i) => (
          <div className="gal-row" key={i}>
            <ImageField idp={"g" + i} label={`Плитка ${i + 1}`} value={it} onChange={v => setG(g.map((x, j) => (j === i ? { ...x, ...v } : x)))} />
            <div className="fgrid">
              <div className="f"><label htmlFor={"gt" + i}>Метка</label><input id={"gt" + i} type="text" value={it.tag || ""} placeholder="Кашпо" onChange={e => setG(g.map((x, j) => (j === i ? { ...x, tag: e.target.value } : x)))} /></div>
              <div className="f"><label htmlFor={"gx" + i}>Подпись</label><input id={"gx" + i} type="text" value={it.text || ""} placeholder="Гранёная поверхность" onChange={e => setG(g.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} /></div>
              <div className="f"><label htmlFor={"gh" + i}>Ссылка</label>
                <select id={"gh" + i} value={it.href || ""} onChange={e => setG(g.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))}>
                  <option value="">Без ссылки</option><option value="/#catalog">Каталог</option>
                  {models.map(m => <option key={m.id} value={`/models/${m.slug}`}>{m.name}</option>)}
                  {(s.articles || []).filter(a => a.published && !a.deleted).map(a => <option key={a.id} value={`/blog/${a.slug}`}>Статья: {a.title}</option>)}
                </select></div>
              <div className="f"><label htmlFor={"gs" + i}>Размер</label>
                <select id={"gs" + i} value={it.size || ""} onChange={e => setG(g.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)))}>
                  <option value="">Обычная</option><option value="tall">Высокая</option><option value="wide">Широкая</option></select></div>
            </div>
            <div className="gal-tools">
              <button type="button" className="mini-btn" disabled={!i} onClick={() => move(i, -1)} aria-label="Выше"><ArrowUp size={14} /></button>
              <button type="button" className="mini-btn" disabled={i === g.length - 1} onClick={() => move(i, 1)} aria-label="Ниже"><ArrowDown size={14} /></button>
              <button type="button" className="mini-btn" onClick={() => { setG(g.filter((_, j) => j !== i)); toast("Плитка убрана"); }} aria-label="Удалить плитку"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        <div className="actions">
          <button type="button" className="btn" onClick={() => setG([...g, { src: "", alt: "", tag: "", text: "", href: "", size: "" }])}><Plus size={14} /> Добавить плитку</button>
          <button type="button" className="btn" onClick={() => { upd({ gallery: DEFAULT_HOME.gallery }); toast("Галерея как была изначально"); }}>Вернуть исходную</button>
        </div>
        <small className="panel-sub">Плитки без картинки на сайте не показываются.</small>
      </section>

      <section className="panel"><h2>Блок «Как это работает»</h2>
        <ImageField idp="ed" label="Фото слева" value={h.editorial} onChange={v => upd({ editorial: v })} hint="Горизонтальное или квадратное" />
      </section>
    </>
  );
}

// ---------- SEO и реквизиты ----------
export function AdminSeo() {
  const { s, set } = useStore();
  const seo = s.seo || {}, co = s.company || {};
  const upd = patch => set(p => ({ seo: { ...(p.seo || {}), ...patch } }));
  const updC = patch => set(p => ({ company: { ...(p.company || {}), ...patch } }));
  const f = (k, label, opts = {}) => (
    <div className="f"><label htmlFor={"seo" + k}>{label}{opts.max && <small className="cnt"> {(seo[k] || "").length}/{opts.max}</small>}</label>
      {opts.area ? <textarea id={"seo" + k} rows={3} value={seo[k] || ""} placeholder={opts.ph} onChange={e => upd({ [k]: e.target.value })} />
        : <input id={"seo" + k} type="text" value={seo[k] || ""} placeholder={opts.ph} onChange={e => upd({ [k]: e.target.value })} />}
      {opts.hint && <small>{opts.hint}</small>}</div>
  );
  const c = (k, label, ph) => <div className="f"><label htmlFor={"co" + k}>{label}</label><input id={"co" + k} type="text" value={co[k] || ""} placeholder={ph} onChange={e => updC({ [k]: e.target.value })} /></div>;
  const host = typeof location !== "undefined" ? location.host : "";
  return (
    <>
      <div className="adm-h"><div><Eyebrow /><h1>SEO и реквизиты</h1></div></div>
      <section className="panel"><h2>Сайт в поиске</h2>
        <div className="snippet" aria-label="Как сайт выглядит в выдаче">
          <span className="snippet-url">{host}</span>
          <b className="snippet-title">{seo.title || "Заголовок сайта"}</b>
          <span className="snippet-desc">{seo.description || "Описание сайта"}</span>
        </div>
        {f("title", "Заголовок главной", { max: 60, ph: "lola.stl — авторские STL-модели кашпо для 3D-печати" })}
        {f("description", "Описание сайта", { max: 160, area: true, ph: "Пара предложений о магазине" })}
        {f("keywords", "Ключевые слова", { ph: "STL-модели, 3D-печать, кашпо", hint: "Через запятую. Яндекс и Google почти не учитывают, но вреда нет." })}
        <ImageField idp="og" label="Картинка для соцсетей и мессенджеров" alt={false} value={{ src: seo.ogImage }} onChange={v => upd({ ogImage: v.src })}
          hint="1200 × 630 px. Пусто — рисуется автоматически с фото работ. У моделей и статей своя картинка." />
      </section>
      <section className="panel"><h2>Статьи</h2>
        {f("blogTitle", "Заголовок раздела статей", { max: 60, ph: "Статьи о 3D-печати кашпо" })}
        {f("blogDescription", "Описание раздела", { max: 160, area: true })}
      </section>
      <section className="panel"><h2>Поисковики и соцсети</h2>
        <div className="fgrid">
          {f("yandex", "Код Яндекс Вебмастера", { ph: "из мета-тега yandex-verification", hint: "Вебмастер → Права доступа → Мета-тег: только значение content." })}
          {f("google", "Код Google Search Console", { ph: "из мета-тега google-site-verification" })}
        </div>
        {f("sameAs", "Ссылки на соцсети магазина", { ph: "https://t.me/lola_stl, https://vk.com/lola_stl", hint: "Через запятую. Попадают в разметку организации — поисковики связывают их с сайтом." })}
        <p className="panel-sub">Индексация включается переменной INDEXING=on на сервере, когда будут заполнены реквизиты и оферта.</p>
      </section>
      <section className="panel"><h2>Реквизиты продавца</h2>
        <p className="panel-sub">Показываются в подвале сайта и в чеках покупателей.</p>
        <div className="fgrid">{c("name", "Продавец", "ИП Иванова Анна Сергеевна")}{c("inn", "ИНН", "123456789012")}{c("ogrn", "ОГРНИП", "")}</div>
        <div className="fgrid">{c("email", "Email для покупателей", "shop@greennessx.ru")}{c("phone", "Телефон", "")}</div>
      </section>
    </>
  );
}

// ---------- статьи ----------
export function AdminArticles() {
  const { s } = useStore();
  const list = (s.articles || []).filter(a => !a.deleted).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return (
    <>
      <div className="adm-h"><div><Eyebrow /><h1>Статьи</h1></div><Link href="/admin/articles/new" className="button button-dark"><Plus size={16} /> Новая статья</Link></div>
      <p className="panel-sub">Статьи приводят покупателей из поиска. Опубликованные видны в разделе «Статьи», в карте сайта и в меню.</p>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Статья</th><th>Дата</th><th>Статус</th><th></th></tr></thead>
        <tbody>{list.length ? list.map(a => (
          <tr key={a.id} className={a.published ? "" : "off"}>
            <td><b>{a.title || "Без названия"}</b><div className="meta">/blog/{a.slug}</div></td>
            <td className="mono">{a.date}</td>
            <td>{a.published ? <span className="tag">опубликована</span> : "черновик"}</td>
            <td className="r"><div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              {a.published && <a href={`/blog/${a.slug}`} target="_blank" rel="noopener" className="mini-btn">Открыть</a>}
              <Link href={`/admin/articles/${a.id}`} className="mini-btn">Изменить</Link></div></td>
          </tr>
        )) : <tr><td colSpan={4} className="meta" style={{ padding: 20 }}>Статей пока нет.</td></tr>}</tbody>
      </table></div>
    </>
  );
}

const newArticle = () => ({ id: "a" + Date.now().toString(36), slug: "", title: "", date: todayIso(), excerpt: "", cover: { src: "", alt: "" }, body: "", published: false, seoTitle: "", seoDesc: "" });

const HELP = [
  ["## Заголовок", "раздел"], ["### Подзаголовок", ""], ["**жирный**  *курсив*", ""], ["- пункт списка", "1. нумерованный"],
  ["> цитата", ""], ["[текст](/models/glubina)", "ссылка"], ["![подпись](/media/…)", "фото — кнопкой «Вставить фото»"], ["{{model:slug}}", "карточка модели с ценой"],
];

export function AdminArticleEditor({ id }) {
  const { s, set, toast } = useStore();
  const router = useRouter();
  const isNew = id === "new";
  const found = (s.articles || []).find(a => a.id === id);
  const [d, setD] = useState(() => (isNew ? newArticle() : found ? JSON.parse(JSON.stringify(found)) : null));
  const [err, setErr] = useState(""), [view, setView] = useState("edit"), [busy, setBusy] = useState(false), [confirmDel, setConfirmDel] = useState(false);
  const upd = patch => setD(p => ({ ...p, ...patch }));
  const models = (s.models || []).filter(m => !m.deleted && !m.hidden);
  const byslug = useMemo(() => Object.fromEntries(models.map(m => [m.slug, m])), [models]);
  if (!d) return <div className="empty-state">Статья не найдена. <Link href="/admin/articles">К списку статей</Link></div>;

  const insert = text => {
    const ta = document.getElementById("aBody");
    const pos = ta ? ta.selectionStart : d.body.length;
    const before = d.body.slice(0, pos), after = d.body.slice(pos);
    upd({ body: before + (before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "") + text + "\n\n" + after.replace(/^\n+/, "") });
  };
  const addPhoto = async f => {
    if (!f) return;
    setBusy(true);
    try { insert(`![${(f.name || "").replace(/\.[^.]+$/, "")}](${await uploadImage(f)})`); toast("Фото вставлено — поправьте подпись в квадратных скобках"); }
    catch (e) { toast(e.message); }
    setBusy(false);
  };
  const save = () => {
    const title = (d.title || "").trim();
    if (!title) { setErr("Укажите заголовок статьи."); document.getElementById("aTitle")?.focus(); return; }
    if (busy) { toast("Дождитесь окончания загрузки фото"); return; }
    let slug = d.slug || slugify(title);
    const taken = new Set((s.articles || []).filter(a => a.id !== d.id && !a.deleted).map(a => a.slug));
    for (let i = 2; taken.has(slug); i++) slug = slugify(title) + "-" + i;
    const next = { ...d, title, slug };
    const exists = (s.articles || []).some(a => a.id === d.id);
    set(p => ({ articles: exists ? p.articles.map(a => (a.id === d.id ? next : a)) : [next, ...(p.articles || [])] }));
    router.push("/admin/articles");
    toast(next.published ? "Статья сохранена и опубликована" : "Черновик сохранён");
  };
  const del = () => {
    set(p => ({ articles: p.articles.map(a => (a.id === d.id ? { ...a, deleted: true, published: false } : a)) }));
    router.push("/admin/articles");
    toast("Статья удалена");
  };

  return (
    <>
      <div className="adm-h"><div><Eyebrow t={`Статьи · ${isNew ? "новая" : "редактирование"}`} /><h1>{d.title || "Новая статья"}</h1></div>
        <Link href="/admin/articles" className="button button-outline"><ArrowLeft size={16} /> К списку</Link></div>
      <div className="panel">
        <div className="f"><label htmlFor="aTitle">Заголовок</label><input id="aTitle" type="text" value={d.title} placeholder="Как напечатать кашпо в режиме вазы" onChange={e => upd({ title: e.target.value })} />{err && <span className="err">{err}</span>}</div>
        <div className="fgrid">
          <div className="f"><label htmlFor="aSlug">Адрес страницы</label><input id="aSlug" type="text" value={d.slug} placeholder={slugify(d.title || "statya")} onChange={e => upd({ slug: slugify(e.target.value) })} /><small>/blog/{d.slug || slugify(d.title || "statya")}</small></div>
          <div className="f"><label htmlFor="aDate">Дата публикации</label><input id="aDate" type="date" value={d.date} onChange={e => upd({ date: e.target.value })} /></div>
        </div>
        <div className="f"><label htmlFor="aEx">Короткое описание</label><textarea id="aEx" rows={2} value={d.excerpt} placeholder="Одно-два предложения: видно в списке статей и под заголовком" onChange={e => upd({ excerpt: e.target.value })} /></div>
        <ImageField idp="aCover" label="Обложка" value={d.cover} onChange={v => upd({ cover: v })} hint="Горизонтальная, от 1200 px. Становится картинкой для соцсетей." />

        <div className="f">
          <div className="md-bar">
            <span className="lbl">Текст статьи</span>
            <div className="seg" role="group" aria-label="Режим">
              <button type="button" aria-pressed={view === "edit"} onClick={() => setView("edit")}>Текст</button>
              <button type="button" aria-pressed={view === "preview"} onClick={() => setView("preview")}>Предпросмотр</button>
            </div>
          </div>
          {view === "edit" ? <>
            <div className="md-tools">
              <label className="mini-btn" htmlFor="aPhoto">{busy ? "Загружаем…" : "Вставить фото"}</label>
              <input id="aPhoto" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { addPhoto(e.target.files?.[0]); e.target.value = ""; }} />
              <select aria-label="Вставить карточку модели" value="" onChange={e => { if (e.target.value) insert(`{{model:${e.target.value}}}`); }}>
                <option value="">Вставить модель…</option>
                {models.map(m => <option key={m.id} value={m.slug}>{m.name}</option>)}
              </select>
              <button type="button" className="mini-btn" onClick={() => insert("## Заголовок раздела")}>Заголовок</button>
            </div>
            <textarea id="aBody" className="md-area" rows={22} value={d.body} onChange={e => upd({ body: e.target.value })}
              placeholder={"Абзацы разделяйте пустой строкой.\n\n## Что понадобится\n\n- шёлковый PLA\n- сопло 0,6 мм"} />
            <details className="md-help"><summary>Как оформлять текст</summary>
              <dl>{HELP.map(([a, b]) => <Fragment key={a}><dt><code>{a}</code></dt><dd>{b}</dd></Fragment>)}</dl></details>
          </> : (
            <div className="article-body md-preview">
              {d.body.trim() ? <Markdown src={d.body} renderModel={slug => <span className="md-model">Карточка модели: {byslug[slug]?.name || `«${slug}» не найдена`}</span>} />
                : <p className="panel-sub">Текста пока нет.</p>}
            </div>
          )}
        </div>
        <SeoFields title={d.seoTitle} desc={d.seoDesc} onChange={upd} idp="a" hintTitle={d.title || "Заголовок статьи"} hintDesc={d.excerpt || plainText(d.body).slice(0, 150) || "Короткое описание"} />
        <div className="actions">
          <label className="check"><input type="checkbox" checked={!!d.published} onChange={e => upd({ published: e.target.checked })} /><span>Опубликовать на сайте</span></label>
        </div>
        <div className="actions">
          <button type="button" className="btn primary" onClick={save}>{d.published ? "Сохранить и опубликовать" : "Сохранить черновик"}</button>
          <Link href="/admin/articles" className="btn">Отмена</Link>
          {!isNew && <button type="button" className="btn danger" style={{ marginLeft: "auto" }} onClick={() => setConfirmDel(true)}>Удалить статью</button>}
        </div>
        {confirmDel && <div className="confirm"><span>Статья пропадёт с сайта и из админки.</span>
          <button type="button" className="btn danger" onClick={del}>Удалить</button><button type="button" className="btn" onClick={() => setConfirmDel(false)}>Оставить</button></div>}
      </div>
    </>
  );
}

// ---------- аналитика ----------
const PERIODS = [[7, "7 дней"], [30, "30 дней"], [90, "90 дней"], [365, "Год"], [0, "Всё время"]];
const pct = (a, b) => (b ? Math.round((a - b) / b * 100) : null);
const fmtKey = (k, unit) => {
  const d = new Date((unit === "month" ? k + "-01" : k) + "T12:00:00Z");
  return unit === "month" ? d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit", timeZone: "UTC" })
    : d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });
};

function Kpi({ label, value, cur, prev, money, note }) {
  const d = prev == null ? null : pct(cur, prev);
  return (
    <div className="stat kpi">
      <span>{label}</span>
      <b>{value}</b>
      {d != null ? <small className={d > 0 ? "up" : d < 0 ? "down" : ""}>
        {d > 0 ? <TrendingUp size={13} aria-hidden="true" /> : d < 0 ? <TrendingDown size={13} aria-hidden="true" /> : null}
        {d > 0 ? "+" : ""}{d}% к прошлому периоду{money ? ` (${rub(prev)})` : ` (${prev})`}</small>
        : note ? <small>{note}</small> : null}
    </div>
  );
}

// Столбики выручки по дням/неделям/месяцам. Одна серия — один цвет; значения — во всплывающей подсказке.
function RevenueChart({ series, unit }) {
  const [hover, setHover] = useState(null);
  const W = 760, H = 220, P = { l: 52, r: 8, t: 12, b: 26 };
  const max = Math.max(1, ...series.map(x => x.revenue));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const bw = iw / series.length, gap = Math.min(2, bw * .2);
  const y = v => P.t + ih - v / top * ih;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const every = Math.ceil(series.length / 8);
  const h = hover != null ? series[hover] : null;
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Выручка по периодам" onMouseLeave={() => setHover(null)}>
        {ticks.map(t => <g key={t}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="grid" /><text x={P.l - 8} y={y(t) + 4} className="axis" textAnchor="end">{t >= 1000 ? Math.round(t / 1000) + "k" : t}</text></g>)}
        {series.map((x, i) => {
          const bx = P.l + i * bw + gap / 2, bh = Math.max(x.revenue ? 2 : 0, ih - (y(x.revenue) - P.t));
          return <g key={x.key}>
            {bh > 0 && <path className={"bar" + (hover === i ? " on" : "")} d={roundTop(bx, P.t + ih - bh, Math.max(1, bw - gap), bh, Math.min(4, (bw - gap) / 2))} />}
            <rect x={P.l + i * bw} y={P.t} width={bw} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={-1} />
            {i % every === 0 && <text x={P.l + i * bw + bw / 2} y={H - 8} className="axis" textAnchor="middle">{fmtKey(x.key, unit)}</text>}
          </g>;
        })}
      </svg>
      {h && <div className="chart-tip" style={{ left: `${(P.l + hover * bw + bw / 2) / W * 100}%` }}>
        <b>{unit === "week" ? "Неделя с " : ""}{fmtKey(h.key, unit)}</b><span>{rub(h.revenue)}</span><span>{h.orders} {h.orders === 1 ? "заказ" : "заказов"}</span></div>}
    </div>
  );
}
function niceStep(max) {
  const raw = max / 4, p = 10 ** Math.floor(Math.log10(raw)), n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
function roundTop(x, y, w, h, r) {
  r = Math.min(r, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

// Таблица с полоской доли: значение текстом, полоска — только для сравнения на глаз
function ShareTable({ title, rows, cols, value }) {
  const max = Math.max(1, ...rows.map(value));
  return (
    <section className="panel"><h2>{title}</h2>
      {rows.length ? <table className="share-tbl">
        <thead><tr>{cols.map(c => <th key={c[0]} className={c[2] ? "r" : ""}>{c[0]}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={i}>{cols.map(([h, get, right], j) => (
            <td key={h} className={right ? "r mono" : ""}>{j === 0 ? <><span>{get(r)}</span><i className="share-bar" style={{ width: value(r) / max * 100 + "%" }} /></> : get(r)}</td>
          ))}</tr>
        ))}</tbody>
      </table> : <p className="panel-sub">Нет данных за период.</p>}
    </section>
  );
}

export function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null), [err, setErr] = useState("");
  const load = useCallback(async () => {
    setErr("");
    const { ok, data } = await api(`/api/admin/analytics?days=${days}`);
    if (ok) setData(data); else setErr(data.error || "Не получилось загрузить аналитику");
  }, [days]);
  useEffect(() => { load(); }, [load]);
  const k = data?.kpi, p = data?.prev;
  return (
    <>
      <div className="adm-h"><div><Eyebrow /><h1>Аналитика заказов</h1></div>
        <div className="seg" role="group" aria-label="Период">{PERIODS.map(([d, t]) => <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)}>{t}</button>)}</div></div>
      {err && <div className="empty-state">{err}</div>}
      {!data ? <div className="skeleton" aria-busy="true">Считаем…</div> : <>
        <div className="stat-row">
          <Kpi label="Выручка" value={rub(k.revenue)} cur={k.revenue} prev={p?.revenue} money />
          <Kpi label="Оплаченные заказы" value={k.orders} cur={k.orders} prev={p?.orders} />
          <Kpi label="Средний чек" value={rub(k.avg)} cur={k.avg} prev={p?.avg} money />
          <Kpi label="Продано моделей" value={k.items} cur={k.items} prev={p?.items} />
        </div>
        <div className="stat-row">
          <Kpi label="Оплатили из оформивших" value={Math.round(k.conversion * 100) + "%"} note={`${k.orders} из ${k.created} заказов`} />
          <Kpi label="Покупатели" value={k.customers} note={`новых ${k.newCustomers} · повторных ${k.returning}`} />
          <Kpi label="Скидки" value={rub(k.discounts)} cur={k.discounts} prev={p?.discounts} money />
          <Kpi label="Скачиваний" value={data.downloads} note={data.statuses.review ? `на проверке: ${data.statuses.review}` : "без подозрительных"} />
        </div>
        <section className="panel"><h2>Выручка {data.period.unit === "day" ? "по дням" : data.period.unit === "week" ? "по неделям" : "по месяцам"}</h2>
          {k.orders ? <RevenueChart series={data.series} unit={data.period.unit} /> : <p className="panel-sub">За этот период оплаченных заказов нет.</p>}
          <details className="chart-table"><summary>Таблицей</summary>
            <table className="share-tbl"><thead><tr><th>Период</th><th className="r">Заказы</th><th className="r">Выручка</th></tr></thead>
              <tbody>{data.series.filter(x => x.orders).map(x => <tr key={x.key}><td>{fmtKey(x.key, data.period.unit)}</td><td className="r mono">{x.orders}</td><td className="r mono">{rub(x.revenue)}</td></tr>)}</tbody></table>
          </details>
        </section>
        <div className="an-grid">
          <ShareTable title="Популярные модели" rows={data.top} value={r => r.count}
            cols={[["Модель", r => r.name], ["Шт.", r => r.count, 1], ["Из них подарком", r => r.gifts, 1], ["Выручка", r => rub(r.revenue), 1]]} />
          <ShareTable title="Категории" rows={data.categories} value={r => r.revenue}
            cols={[["Категория", r => r.name], ["Шт.", r => r.count, 1], ["Выручка", r => rub(r.revenue), 1]]} />
          <ShareTable title="Откуда заказы" rows={data.channels} value={r => r.revenue}
            cols={[["Канал", r => r.name], ["Заказы", r => r.orders, 1], ["Выручка", r => rub(r.revenue), 1]]} />
          <ShareTable title="Промокоды и скидки" rows={data.discounts} value={r => r.orders}
            cols={[["Скидка", r => r.name], ["Заказы", r => r.orders, 1], ["Скидка всего", r => rub(r.discount), 1], ["Выручка", r => rub(r.revenue), 1]]} />
        </div>
        <p className="panel-sub">Выручка — сумма оплаченных заказов по дате оплаты, московское время. Не оплачено: {data.statuses.pending} ожидают оплаты, {data.statuses.canceled} отменены (неоплаченные заказы отменяются через час).</p>
      </>}
    </>
  );
}
