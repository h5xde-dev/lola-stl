// Письма и сообщения бота. Каждое отправление пишется в журнал (outbox) — его видно в админке.
// Письма уходят одним из способов:
//   UNISENDER_GO_API_KEY — через API Unisender Go по HTTPS (работает, даже когда хостинг закрывает почтовые порты);
//   SMTP_URL — через SMTP (например, smtps://ящик%40yandex.ru:пароль-приложения@smtp.yandex.ru:465).
// Ничего не задано — письмо не уходит, но остаётся в журнале: так ссылку можно открыть при проверке.

import { outboxAdd } from "./repo.js";

const uniKey = () => process.env.UNISENDER_GO_API_KEY;
export const mailProvider = () => (uniKey() ? "unisender" : process.env.SMTP_URL ? "smtp" : null);
export const mailConfigured = () => !!mailProvider();

// MAIL_FROM вида «lola.stl <shop@greennessx.ru>»
function fromParts() {
  const raw = process.env.MAIL_FROM || "lola.stl <no-reply@lola-stl.ru>";
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].replace(/^"|"$/g, ""), email: m[2] } : { name: "", email: raw.trim() };
}

// HTML-версия письма: тот же текст, ссылки кликабельные
const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const toHtml = text => `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1d1726">${
  esc(text).replace(/https?:\/\/[^\s<]+/g, u => `<a href="${u}" style="color:#c02aa8">${u}</a>`).replace(/\n/g, "<br>")}</div>`;

// Unisender Go: https://godocs.unisender.ru/web-api-ref#email-send
// Сервер аккаунта (go1 или go2) — как в адресе личного кабинета: UNISENDER_GO_HOST.
async function sendUnisender(to, subject, text) {
  const host = process.env.UNISENDER_GO_HOST || "go1.unisender.ru";
  const from = fromParts();
  const r = await fetch(`https://${host}/ru/transactional/api/v1/email/send.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "X-API-KEY": uniKey() },
    body: JSON.stringify({ message: {
      recipients: [{ email: to }], subject, from_email: from.email, from_name: from.name || undefined,
      ...(process.env.MAIL_REPLY_TO ? { reply_to: process.env.MAIL_REPLY_TO } : {}),
      body: { plaintext: text, html: toHtml(text) },
      // Без подмены ссылок и пикселя: ссылка на заказ должна остаться как есть
      track_links: 0, track_read: 0,
    } }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.status !== "success") throw new Error(`Unisender Go ${r.status}: ${data.message || data.code || "ошибка"}`);
  const failed = data.failed_emails && Object.entries(data.failed_emails)[0];
  if (failed) throw new Error(`Unisender Go не принял адрес ${failed[0]}: ${failed[1]}`);
}

// Короткие таймауты: если почтовый сервер недоступен, заказ всё равно оформляется за секунды,
// а ошибка видна в журнале писем. Ссылка на заказ есть и в личном кабинете.
let transport;
async function mailer() {
  if (!transport) {
    const nodemailer = (await import("nodemailer")).default;
    // Параметры адреса nodemailer читает как настройки соединения (второй аргумент — это поля письма, не таймауты)
    const u = new URL(process.env.SMTP_URL);
    for (const [k, v] of [["connectionTimeout", 10000], ["greetingTimeout", 10000], ["socketTimeout", 20000]]) if (!u.searchParams.has(k)) u.searchParams.set(k, v);
    transport = nodemailer.createTransport(u.toString());
  }
  return transport;
}

export async function sendMail(to, subject, text) {
  const how = mailProvider();
  if (!how) { await outboxAdd("email", to, subject, text, false, "Почта не настроена"); return false; }
  try {
    if (how === "unisender") await sendUnisender(to, subject, text);
    else await (await mailer()).sendMail({ from: process.env.MAIL_FROM || "lola.stl <no-reply@lola-stl.ru>", to, subject, text,
      ...(process.env.MAIL_REPLY_TO ? { replyTo: process.env.MAIL_REPLY_TO } : {}) });
    await outboxAdd("email", to, subject, text, true);
    return true;
  } catch (e) {
    const msg = String(e.message || e);
    const hint = /timeout|ETIMEDOUT|ECONNREFUSED|ECONNRESET|aborted/i.test(msg) ? " — почтовый сервер недоступен с сервера сайта (часто хостинг закрывает порты 465/587)"
      : /auth|535|534|401|403/i.test(msg) ? " — неверный ключ, логин или пароль" : "";
    await outboxAdd("email", to, subject, text, false, (msg + hint).slice(0, 300));
    return false;
  }
}

export async function sendTelegram(chatId, text, extra = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { await outboxAdd("telegram", String(chatId), null, text, false, "TELEGRAM_BOT_TOKEN не задан"); return false; }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true, ...extra }),
    });
    const ok = r.ok;
    await outboxAdd("telegram", String(chatId), null, text, ok, ok ? null : `HTTP ${r.status}`);
    return ok;
  } catch (e) {
    await outboxAdd("telegram", String(chatId), null, text, false, String(e.message || e).slice(0, 300));
    return false;
  }
}
