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
  if (!mailConfigured()) return bad("Почта не настроена: нужен UNISENDER_API_KEY, UNISENDER_GO_API_KEY или SMTP_URL в настройках сервера");
  const ok = await sendMail(to, "Проверка почты lola.stl", {
    title: "Почта работает",
    intro: "Это тестовое письмо из админки lola.stl. Если вы его видите, письма покупателям доходят — так они и будут выглядеть.",
    items: [{ name: "Пример модели", price: 700 }, { name: "Модель в подарок", price: 0 }],
    total: 700,
    button: { label: "Открыть сайт", url: SITE_URL },
    note: ["Здесь в настоящих письмах — пояснение про личную ссылку на заказ и лицензию."],
  });
  if (ok) return json({ ok: true });
  const [last] = await outboxList(1);
  return bad("Письмо не ушло: " + (last?.error || "ошибка почтового сервера"), 502);
});
