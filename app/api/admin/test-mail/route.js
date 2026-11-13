import { adminOnly, bad, body, json, wrap } from "@/lib/server/http";
import { mailConfigured, sendMail } from "@/lib/server/notify";
import { outboxList } from "@/lib/server/repo";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
// Тестовое письмо из админки: проверка, что почта настроена и письма доходят
export const POST = wrap(async req => {
  const deny = await adminOnly(); if (deny) return deny;
  const to = String((await body(req)).to || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return bad("Укажите email");
  if (!mailConfigured()) return bad("Почта не настроена: нужен SMTP_URL в настройках сервера");
  const ok = await sendMail(to, "Проверка почты lola.stl", `Это тестовое письмо из админки ${SITE_URL}.\n\nЕсли вы его видите, письма покупателям доходят.`);
  if (ok) return json({ ok: true });
  const [last] = await outboxList(1);
  return bad("Письмо не ушло: " + (last?.error || "ошибка почтового сервера"), 502);
});
