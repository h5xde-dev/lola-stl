// Шаблон писем в стиле сайта: тёмный фон, розовый акцент, логотип lola.stl, кнопка действия.
// Вёрстка на таблицах и встроенных стилях — так письмо одинаково выглядит в Яндекс Почте, Mail.ru, Gmail и Outlook.
// Письмо описывается объектом:
//   { title, intro?, paragraphs?: [], button?: { label, url }, items?: [{ name, price }], total?, note?: [], preheader? }
// Возвращает { text, html }: текстовая версия нужна почтовым программам без HTML и для журнала писем.
import { companyLine } from "../content.js";
import { SITE_URL } from "../site.js";

const C = { bg: "#090713", card: "#13101f", line: "#39294b", ink: "#f6edff", ink2: "#d5c6e6", muted: "#b7a9c8", accent: "#ff36cf", cyan: "#26f1dc" };
const FONT = "'Manrope','Segoe UI',Arial,sans-serif";
const DISPLAY = "'Unbounded','Manrope','Segoe UI',Arial,sans-serif";

const esc = t => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Ссылки в тексте — кликабельные, переносы строк — <br>
const rich = t => esc(t).replace(/https?:\/\/[^\s<]+/g, u => `<a href="${u}" style="color:${C.accent};text-decoration:underline;word-break:break-all">${u}</a>`).replace(/\n/g, "<br>");
const rub = n => `${Math.round(Number(n) || 0).toLocaleString("ru-RU").replace(/ /g, " ")} ₽`;
const host = SITE_URL.replace(/^https?:\/\//, "");

export function renderMail(m, company = {}) {
  const items = (m.items || []).filter(Boolean);
  const notes = [].concat(m.note || []).filter(Boolean);
  const paras = [m.intro, ...(m.paragraphs || [])].filter(Boolean);

  // ---- текстовая версия ----
  const text = [
    m.title,
    "",
    ...paras.flatMap(p => [p, ""]),
    ...(items.length ? [...items.map(i => `• ${i.name}${i.price != null ? ` — ${i.price ? rub(i.price) : "в подарок"}` : ""}`), ...(m.total != null ? [`Итого: ${rub(m.total)}`] : []), ""] : []),
    ...(m.button ? [`${m.button.label}: ${m.button.url}`, ""] : []),
    ...notes.flatMap(n => [n, ""]),
    "—",
    `lola.stl · ${SITE_URL}`,
    companyLine(company),
  ].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n").trim();

  // ---- HTML ----
  const p = t => `<p style="margin:0 0 14px;font:400 15px/1.6 ${FONT};color:${C.ink2}">${rich(t)}</p>`;
  const rows = items.map(i => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${C.line};font:500 14px/1.4 ${FONT};color:${C.ink}">${esc(i.name)}</td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid ${C.line};font:600 14px/1.4 ${FONT};color:${i.price ? C.ink : C.cyan};white-space:nowrap">${i.price != null ? (i.price ? rub(i.price) : "в подарок") : ""}</td>
        </tr>`).join("");
  const table = items.length ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 22px;border-top:1px solid ${C.line}">${rows}
        ${m.total != null ? `<tr><td style="padding:12px 0 0;font:600 14px/1.4 ${FONT};color:${C.muted}">Итого</td><td align="right" style="padding:12px 0 0;font:700 18px/1.3 ${DISPLAY};color:${C.ink};white-space:nowrap">${rub(m.total)}</td></tr>` : ""}
      </table>` : "";
  const button = m.button ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 24px"><tr>
        <td bgcolor="${C.accent}" style="border-radius:3px;background:${C.accent};background-image:linear-gradient(90deg,#ff36cf,#a855f7)">
          <a href="${esc(m.button.url)}" style="display:inline-block;padding:15px 28px;font:700 15px/1 ${FONT};color:#ffffff;text-decoration:none;border-radius:3px">${esc(m.button.label)}&nbsp;&rarr;</a>
        </td></tr></table>
      <p style="margin:-12px 0 22px;font:400 12px/1.5 ${FONT};color:${C.muted}">Если кнопка не открывается, скопируйте ссылку:<br><a href="${esc(m.button.url)}" style="color:${C.muted};word-break:break-all">${esc(m.button.url)}</a></p>` : "";
  const noteBlock = notes.length ? `
      <div style="margin:4px 0 0;padding:14px 16px;border:1px solid ${C.line};border-radius:6px;background:${C.bg}">
        ${notes.map(n => `<p style="margin:0 0 8px;font:400 13px/1.55 ${FONT};color:${C.muted}">${rich(n)}</p>`).join("")}
      </div>` : "";
  const req = esc(companyLine(company));
  const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"><title>${esc(m.title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg}" bgcolor="${C.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(m.preheader || m.intro || m.title)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background:${C.bg}">
  <tr><td align="center" style="padding:28px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
      <tr><td style="padding:0 6px 18px">
        <a href="${SITE_URL}" style="text-decoration:none">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td width="34" height="34" align="center" bgcolor="${C.accent}" style="width:34px;height:34px;border-radius:17px;background:${C.accent};font:700 13px/34px ${DISPLAY};color:${C.card}">L</td>
            <td style="padding-left:10px;font:700 18px/1 ${DISPLAY};color:${C.ink}">lola<span style="color:${C.cyan}">.stl</span><br><span style="font:600 9px/1.8 ${FONT};letter-spacing:.12em;color:${C.muted}">STL-МОДЕЛИ ДЛЯ ПЕЧАТИ</span></td>
          </tr></table>
        </a>
      </td></tr>
      <tr><td bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.line};border-radius:8px;padding:30px 28px 26px">
        <h1 style="margin:0 0 16px;font:500 24px/1.25 ${DISPLAY};color:${C.ink}">${esc(m.title)}</h1>
        ${paras.map(p).join("")}
        ${table}
        ${button}
        ${noteBlock}
      </td></tr>
      <tr><td style="padding:18px 6px 0;font:400 12px/1.6 ${FONT};color:${C.muted}">
        <a href="${SITE_URL}/account" style="color:${C.muted}">Личный кабинет</a> &nbsp;·&nbsp;
        <a href="${SITE_URL}/contacts" style="color:${C.muted}">Контакты</a> &nbsp;·&nbsp;
        <a href="${SITE_URL}/offer" style="color:${C.muted}">Оферта и лицензия</a><br>
        lola.stl · <a href="${SITE_URL}" style="color:${C.muted}">${esc(host)}</a>${req ? `<br>${req}` : ""}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
  return { text, html };
}
