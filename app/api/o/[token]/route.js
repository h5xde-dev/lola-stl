import { bad, json, wrap } from "@/lib/server/http";
import { addOrderAccess } from "@/lib/server/auth";
import { orderByToken, orderCode } from "@/lib/server/repo";
import { refreshOrderPayment, serializeOrders } from "@/lib/server/shop";

export const dynamic = "force-dynamic";
// Постоянная личная ссылка на заказ: открывает заказ на этом устройстве (кука доступа к заказу)
// и возвращает его для страницы.
export const GET = wrap(async (req, { params }) => {
  // Ссылка работает в любом браузере: сюда же банк возвращает покупателя после оплаты,
  // поэтому статус неоплаченного заказа сразу уточняется у банка.
  const o = await refreshOrderPayment(await orderByToken((await params).token));
  if (!o) return bad("Заказ не найден. Проверьте ссылку из письма.", 404);
  if (o.status === "canceled") return json({ canceled: true, code: orderCode(o.id) });
  if (o.status === "pending") return json({ pending: true, url: o.payment_url, code: orderCode(o.id) });
  await addOrderAccess(o.id);
  const [order] = await serializeOrders([o], { own: true });
  return json({ order });
});
