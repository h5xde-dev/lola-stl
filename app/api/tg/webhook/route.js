import { timingSafeEqual } from "node:crypto";
import { tgWebhookSecret } from "@/lib/server/auth";
import { sendTelegram } from "@/lib/server/notify";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const open = (text, path = "/") => ({ reply_markup: { inline_keyboard: [[{ text, web_app: { url: SITE_URL + path } }]] } });

// Обновления от бота. На /start и любое сообщение отвечаем кнопкой, которая открывает магазин внутри Telegram.
// Проверяем секрет из заголовка: так запросы может присылать только Telegram.
export async function POST(req) {
  const got = Buffer.from(req.headers.get("x-telegram-bot-api-secret-token") || ""), want = Buffer.from(tgWebhookSecret());
  if (got.length !== want.length || !timingSafeEqual(got, want)) return new Response("forbidden", { status: 403 });
  const u = await req.json().catch(() => null);
  const msg = u?.message;
  if (msg?.chat?.id && msg.chat.type === "private") {
    const text = String(msg.text || "");
    if (text.startsWith("/purchases")) await sendTelegram(msg.chat.id, "Ваши покупки и файлы:", open("Личный кабинет", "/account"));
    else await sendTelegram(msg.chat.id,
      "Привет! Это магазин авторских STL-моделей lola.stl: кашпо и лотки для рассады для 3D-печати.\n\nЗа каждые 2 модели — третья в подарок. Файлы приходят сразу после оплаты, отпечатки можно продавать.",
      open("Открыть магазин"));
  }
  return Response.json({ ok: true }); // Telegram ждёт 200, иначе повторяет обновление
}
