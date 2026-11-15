import { json, wrap } from "@/lib/server/http";
import { orderById, orderByPayment, setStatus } from "@/lib/server/repo";
import { fetchPayment, verifyTochkaWebhook } from "@/lib/server/pay";
import { finalize } from "@/lib/server/shop";

export const dynamic = "force-dynamic";

// Ищет поле в содержимом вебхука на любой глубине (формат события может расширяться)
function pick(o, key) {
  if (!o || typeof o !== "object") return undefined;
  if (key in o) return o[key];
  for (const v of Object.values(o)) { const r = pick(v, key); if (r !== undefined) return r; }
  return undefined;
}

// Вебхук Точки acquiringInternetPayment: тело — JWT (RS256), подпись проверяется публичным ключом Точки.
// Даже после проверки подписи статус перезапрашивается через API. Точка ждёт 200, иначе повторяет 30 раз.
// Адрес подключается кнопкой в админке → «Оплата»: https://<домен>/api/tochka/webhook
export const POST = wrap(async req => {
  const raw = await req.text();
  const evt = await verifyTochkaWebhook(raw).catch(e => { console.error("tochka webhook key:", e.message); return null; });
  if (!evt) return json({ ok: false, error: "bad signature" }, 200);
  const pid = pick(evt, "operationId");
  if (!pid) return json({ ok: true }); // тестовый вебхук при подключении
  const p = await fetchPayment(String(pid));
  if (!p) return json({ ok: true });
  const o = (await orderByPayment(String(pid))) || (p.orderId ? await orderById(p.orderId) : null);
  if (!o) return json({ ok: true });
  if (p.paid && Math.abs(p.amount - o.total) < 0.01) await finalize(o.id);
  else if (p.canceled && o.status === "pending") await setStatus(o.id, "canceled");
  return json({ ok: true });
});
