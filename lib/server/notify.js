// Письма и сообщения бота. Каждое отправление пишется в журнал (outbox) — его видно в админке.
// SMTP_URL не задан — письмо не уходит, но остаётся в журнале: так ссылку можно открыть при проверке.

import { outboxAdd } from "./repo.js";

export const mailConfigured = () => !!process.env.SMTP_URL;

export async function sendMail(to, subject, text) {
  if (!mailConfigured()) { await outboxAdd("email", to, subject, text, false, "SMTP не настроен"); return false; }
  try {
    const nodemailer = (await import("nodemailer")).default;
    const tr = nodemailer.createTransport(process.env.SMTP_URL);
    await tr.sendMail({ from: process.env.MAIL_FROM || "lola.stl <no-reply@lola-stl.ru>", to, subject, text });
    await outboxAdd("email", to, subject, text, true);
    return true;
  } catch (e) {
    await outboxAdd("email", to, subject, text, false, String(e.message || e).slice(0, 300));
    return false;
  }
}

export async function sendTelegram(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { await outboxAdd("telegram", String(chatId), null, text, false, "TELEGRAM_BOT_TOKEN не задан"); return false; }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    const ok = r.ok;
    await outboxAdd("telegram", String(chatId), null, text, ok, ok ? null : `HTTP ${r.status}`);
    return ok;
  } catch (e) {
    await outboxAdd("telegram", String(chatId), null, text, false, String(e.message || e).slice(0, 300));
    return false;
  }
}
