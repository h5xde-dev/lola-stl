// Настройка бота для Mini App: кнопка меню «Магазин», вебхук для /start, команды и описание.
// Запуск: TELEGRAM_BOT_TOKEN=… SITE_URL=https://… AUTH_SECRET=… npm run tg:setup
// AUTH_SECRET тот же, что у сайта: из него выводится секрет вебхука.
import { createHmac } from "node:crypto";

const token = process.env.TELEGRAM_BOT_TOKEN, site = (process.env.SITE_URL || "").replace(/\/$/, ""), secret = process.env.AUTH_SECRET;
if (!token || !site.startsWith("https://") || !secret) { console.error("Нужны TELEGRAM_BOT_TOKEN, SITE_URL (https://…) и AUTH_SECRET"); process.exit(1); }
const call = async (method, body) => {
  const r = await (await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
  console.log((r.ok ? "✓ " : "✗ ") + method + (r.ok ? "" : ": " + r.description));
  return r;
};
const whSecret = createHmac("sha256", secret).update("tg-webhook").digest("base64url").slice(0, 48);

await call("setChatMenuButton", { menu_button: { type: "web_app", text: "Магазин", web_app: { url: site } } });
await call("setWebhook", { url: `${site}/api/tg/webhook`, secret_token: whSecret, allowed_updates: ["message"], drop_pending_updates: true });
await call("setMyCommands", { commands: [{ command: "start", description: "Открыть магазин" }, { command: "purchases", description: "Мои покупки и файлы" }] });
await call("setMyShortDescription", { short_description: "Авторские STL-модели кашпо для 3D-печати. Файлы сразу после оплаты." });
await call("setMyDescription", { description: "lola.stl — авторские STL-модели кашпо и лотков для рассады.\n\n• За каждые 2 модели — третья в подарок\n• Файлы сразу после оплаты, без регистрации\n• Отпечатки можно продавать\n\nНажмите «Магазин», чтобы выбрать модели." });
const info = await (await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)).json();
console.log("вебхук:", info.result?.url, "| ошибок:", info.result?.last_error_message || "нет");
