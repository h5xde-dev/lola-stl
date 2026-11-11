import { bad, json, wrap } from "@/lib/server/http";
import { getCustomerId, getOrderAccess } from "@/lib/server/auth";
import { orderById, orderIdFromCode } from "@/lib/server/repo";
import { fetchPayment, provider } from "@/lib/server/pay";
import { finalize } from "@/lib/server/shop";

export const dynamic = "force-dynamic";
// Статус заказа для страницы возврата после оплаты.
// Если вебхук ЮKassa ещё не дошёл, статус платежа проверяется напрямую.
export const GET = wrap(async (req, { params }) => {
  const id = orderIdFromCode((await params).code);
  let o = await orderById(id);
  const cid = await getCustomerId(), access = await getOrderAccess();
  if (!o || !(o.customer_id === cid || access.includes(o.id))) return bad("Заказ не найден", 404);
  if (o.status === "pending" && o.payment_id && provider() === "yookassa") {
    const p = await fetchPayment(o.payment_id);
    if (p?.paid && p.orderId === o.id) { await finalize(o.id); o = await orderById(id); }
  }
  return json({ status: o.status, total: o.total, url: o.status === "pending" ? o.payment_url : null });
});
