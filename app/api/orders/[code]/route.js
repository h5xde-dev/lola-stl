import { bad, json, wrap } from "@/lib/server/http";
import { getCustomerId, getOrderAccess } from "@/lib/server/auth";
import { orderById, orderIdFromCode } from "@/lib/server/repo";
import { activeProvider, fetchPayment } from "@/lib/server/pay";
import { finalize } from "@/lib/server/shop";

export const dynamic = "force-dynamic";
// Статус заказа для страницы возврата после оплаты.
// Если уведомление об оплате ещё не дошло, статус платежа проверяется напрямую у Точки или ЮKassa.
export const GET = wrap(async (req, { params }) => {
  const id = orderIdFromCode((await params).code);
  let o = await orderById(id);
  const cid = await getCustomerId(), access = await getOrderAccess();
  if (!o || !(o.customer_id === cid || access.includes(o.id))) return bad("Заказ не найден", 404);
  if (["pending", "canceled"].includes(o.status) && o.payment_id && !o.test && activeProvider()) {
    const p = await fetchPayment(o.payment_id).catch(() => null);
    if (p?.paid && p.orderId === o.id && Math.abs(p.amount - o.total) < 0.01) { await finalize(o.id); o = await orderById(id); }
  }
  return json({ status: o.status, total: o.total, url: o.status === "pending" ? o.payment_url : null });
});
