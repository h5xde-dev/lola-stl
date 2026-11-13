// Простая разметка статей (подмножество Markdown) → React-элементы. HTML из текста не вставляется,
// поэтому статья не может сломать страницу или подсунуть скрипт.
//   ## Заголовок, ### Подзаголовок, - список, 1. нумерованный, > цитата
//   ![подпись](/media/фото.jpg) — картинка отдельной строкой
//   {{model:slug}} — карточка модели из каталога
//   **жирный**, *курсив*, `код`, [текст](/models/glubina или https://…)
import Image from "next/image";
import Link from "next/link";

const safeUrl = u => (/^(\/(?!\/)|https?:\/\/)/.test(u) ? u : null);

function inline(text, key = "i") {
  const out = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0, m, n = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${n++}`;
    if (m[2]) out.push(<strong key={k}>{m[2]}</strong>);
    else if (m[3]) out.push(<em key={k}>{m[3]}</em>);
    else if (m[4]) out.push(<code key={k}>{m[4]}</code>);
    else {
      const url = safeUrl(m[6]);
      out.push(!url ? m[5] : url.startsWith("/") ? <Link key={k} href={url}>{m[5]}</Link>
        : <a key={k} href={url} target="_blank" rel="noopener nofollow">{m[5]}</a>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// Разбор на блоки. renderModel(slug) — как показать карточку модели (передаёт страница).
export function parseBlocks(src) {
  const lines = String(src || "").replace(/\r/g, "").split("\n");
  const blocks = [];
  let para = [];
  const flush = () => { if (para.length) { blocks.push({ t: "p", text: para.join(" ") }); para = []; } };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) { flush(); continue; }
    let m;
    if ((m = l.match(/^(#{2,3})\s+(.+)/))) { flush(); blocks.push({ t: m[1].length === 2 ? "h2" : "h3", text: m[2] }); }
    else if ((m = l.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) { flush(); blocks.push({ t: "img", alt: m[1], src: m[2] }); }
    else if ((m = l.match(/^\{\{model:([a-z0-9-]+)\}\}$/i))) { flush(); blocks.push({ t: "model", slug: m[1] }); }
    else if (/^[-*]\s+/.test(l) || /^\d+[.)]\s+/.test(l)) {
      flush();
      const ordered = /^\d/.test(l), items = [];
      while (i < lines.length && (ordered ? /^\d+[.)]\s+/ : /^[-*]\s+/).test(lines[i].trim())) { items.push(lines[i].trim().replace(/^([-*]|\d+[.)])\s+/, "")); i++; }
      i--;
      blocks.push({ t: ordered ? "ol" : "ul", items });
    }
    else if (l.startsWith(">")) { flush(); blocks.push({ t: "quote", text: l.replace(/^>\s?/, "") }); }
    else para.push(l);
  }
  flush();
  return blocks;
}

export function Markdown({ src, renderModel }) {
  return parseBlocks(src).map((b, i) => {
    const k = "b" + i;
    switch (b.t) {
      case "h2": return <h2 key={k}>{inline(b.text, k)}</h2>;
      case "h3": return <h3 key={k}>{inline(b.text, k)}</h3>;
      case "ul": return <ul key={k}>{b.items.map((t, j) => <li key={j}>{inline(t, k + j)}</li>)}</ul>;
      case "ol": return <ol key={k}>{b.items.map((t, j) => <li key={j}>{inline(t, k + j)}</li>)}</ol>;
      case "quote": return <blockquote key={k}>{inline(b.text, k)}</blockquote>;
      case "img": {
        const src = safeUrl(b.src);
        if (!src) return null;
        return <figure key={k} className="article-figure">
          <span className="article-img"><Image src={src} alt={b.alt} fill sizes="(max-width: 760px) 100vw, 720px" unoptimized={!src.startsWith("/")} /></span>
          {b.alt && <figcaption>{b.alt}</figcaption>}
        </figure>;
      }
      case "model": return renderModel ? <div key={k} className="article-model">{renderModel(b.slug)}</div> : null;
      default: return <p key={k}>{inline(b.text, k)}</p>;
    }
  });
}

// Первые слова текста — для описания, если его не заполнили
export const plainText = src => parseBlocks(src).filter(b => b.t === "p").map(b => b.text.replace(/[*`]|\[([^\]]+)\]\([^)]+\)/g, "$1")).join(" ");
export const readMinutes = src => Math.max(1, Math.round(String(src || "").split(/\s+/).length / 180));
