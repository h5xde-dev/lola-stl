import { bad, json, wrap } from "@/lib/server/http";
import { getCustomerId, getOrderAccess } from "@/lib/server/auth";
import { orderById, orderIdFromCode } from "@/lib/server/repo";
import { refreshOrderPayment } from "@/lib/server/shop";

export const dynamic = "force-dynamic";
// Статус заказа для страницы возврата после оплаты.
// Если уведомление об оплате ещё не дошло, статус платежа проверяется напрямую у Точки или ЮKassa.
export const GET = wrap(async (req, { params }) => {
  const id = orderIdFromCode((await params).code);
  let o = await orderById(id);
  const cid = await getCustomerId(), access = await getOrderAccess();
  if (!o || !(o.customer_id === cid || access.includes(o.id))) return bad("Заказ не найден", 404);
  o = await refreshOrderPayment(o);
  return json({ status: o.status, total: o.total, url: o.status === "pending" ? o.payment_url : null });
});
