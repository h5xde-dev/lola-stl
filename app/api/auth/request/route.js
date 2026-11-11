import { body, json, wrap } from "@/lib/server/http";
import { sendLoginLink } from "@/lib/server/shop";

export const dynamic = "force-dynamic";
// Новая ссылка на «Мои покупки». Ответ всегда одинаковый — не раскрываем, есть ли такой покупатель.
export const POST = wrap(async req => {
  const { email } = await body(req);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim())) await sendLoginLink(String(email).trim());
  return json({ ok: true });
});
