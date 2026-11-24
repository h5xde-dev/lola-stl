import { timingSafeEqual } from "node:crypto";
import { tgWebhookSecret } from "@/lib/server/auth";
import { sendTelegram } from "@/lib/server/notify";
import { SITE_URL } from "@/lib/site";
import { getCompany } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

// Обновления, на которые уже ответили. Telegram повторяет обновление, если не получил 200 вовремя, —
// по номеру update_id повтор отбрасывается, и бот не шлёт одно и то же сообщение снова и снова.
const seen = globalThis.__tgSeen || (globalThis.__tgSeen = new Map());
const fresh = id => {
  if (id == null) return true;
  if (seen.has(id)) return false;
  seen.set(id, Date.now());
  if (seen.size > 2000) for (const [k, t] of seen) if (Date.now() - t > 3600000 || seen.size > 1500) seen.delete(k); else break;
  return true;
};

const hinted = globalThis.__tgHint || (globalThis.__tgHint = new Map());
const quiet = chat => { const t = hinted.get(chat) || 0; if (Date.now() - t < 6 * 3600000) return false; hinted.set(chat, Date.now()); return true; };

const open = (text, path = "/") => ({ reply_markup: { inline_keyboard: [[{ text, web_app: { url: SITE_URL + path } }]] } });

// Обновления от бота. На /start — приветствие с кнопкой магазина, на /purchases — кабинет,
// на остальные сообщения — подсказка, куда писать (не чаще раза в 6 часов).
// Проверяем секрет из заголовка: так запросы может присылать только Telegram.
export async function POST(req) {
  const got = Buffer.from(req.headers.get("x-telegram-bot-api-secret-token") || ""), want = Buffer.from(tgWebhookSecret());
  if (got.length !== want.length || !timingSafeEqual(got, want)) return new Response("forbidden", { status: 403 });
  const u = await req.json().catch(() => null);
  const msg = u?.message;
  if (msg?.chat?.id && msg.chat.type === "private" && fresh(u.update_id)) try {
    const text = String(msg.text || "").trim();
    if (text.startsWith("/purchases")) await sendTelegram(msg.chat.id, "Ваши покупки и файлы:", open("Личный кабинет", "/account"));
    else if (text.startsWith("/start")) await sendTelegram(msg.chat.id,
      "Привет! Это магазин авторских STL-моделей lola.stl: кашпо, боксы и лотки для рассады для 3D-печати.\n\nЧем больше моделей, тем больше подарков. Файлы приходят сразу после оплаты, отпечатки можно продавать.",
      open("Открыть магазин"));
    else if (quiet(msg.chat.id)) {
      // Обычные сообщения бот не читает: подсказываем, куда писать, но не чаще раза в 6 часов на чат
      const c = await getCompany().catch(() => ({}));
      const who = c.telegram ? `напишите ${c.telegram}` : c.email ? `напишите на ${c.email}` : "напишите нам — контакты на сайте";
      await sendTelegram(msg.chat.id, `Это бот магазина, сообщения здесь не читают. С вопросами ${who}.`, open("Открыть магазин"));
    }
  } catch (e) { console.error("tg webhook:", e.message); }
  return Response.json({ ok: true }); // Telegram ждёт 200, иначе повторяет обновление
}
