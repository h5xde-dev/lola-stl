import { json, wrap } from "@/lib/server/http";
import { orderById, orderByPayment, setStatus } from "@/lib/server/repo";
import { fetchPayment } from "@/lib/server/pay";
import { finalize } from "@/lib/server/shop";

export const dynamic = "force-dynamic";
// Уведомления ЮKassa. Телу запроса не доверяем: статус платежа перепроверяем через API.
// Адрес для настроек магазина: https://<ваш домен>/api/yookassa/webhook (события payment.succeeded и payment.canceled).
export const POST = wrap(async req => {
  const evt = await req.json().catch(() => null);
  const pid = evt?.object?.id;
  if (!pid) return json({ ok: true });
  const p = await fetchPayment(pid);
  if (!p) return json({ ok: true });
  const o = (await orderByPayment(pid)) || (p.orderId ? await orderById(p.orderId) : null);
  if (!o) return json({ ok: true });
  if (p.paid && Math.abs(p.amount - o.total) < 0.01) await finalize(o.id);
  else if (p.canceled && o.status === "pending") await setStatus(o.id, "canceled");
  return json({ ok: true }); // ЮKassa ждёт 200, иначе повторяет уведомление
});
