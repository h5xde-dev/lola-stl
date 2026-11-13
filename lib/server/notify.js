// Письма и сообщения бота. Каждое отправление пишется в журнал (outbox) — его видно в админке.
// SMTP_URL не задан — письмо не уходит, но остаётся в журнале: так ссылку можно открыть при проверке.

import { outboxAdd } from "./repo.js";

export const mailConfigured = () => !!process.env.SMTP_URL;

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
  if (!mailConfigured()) { await outboxAdd("email", to, subject, text, false, "SMTP не настроен"); return false; }
  try {
    await (await mailer()).sendMail({ from: process.env.MAIL_FROM || "lola.stl <no-reply@lola-stl.ru>", to, subject, text });
    await outboxAdd("email", to, subject, text, true);
    return true;
  } catch (e) {
    const msg = String(e.message || e);
    const hint = /timeout|ETIMEDOUT|ECONNREFUSED|ECONNRESET/i.test(msg) ? " — почтовый сервер недоступен с сервера сайта (часто хостинг закрывает порты 465/587)"
      : /auth|535|534/i.test(msg) ? " — неверный логин или пароль приложения" : "";
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
