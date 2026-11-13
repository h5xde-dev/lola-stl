import { bad, body, json, wrap } from "@/lib/server/http";
import { addOrderAccess, getCustomerId, isAdmin } from "@/lib/server/auth";
import { checkout } from "@/lib/server/shop";

export const dynamic = "force-dynamic";
// Создаёт заказ и платёж. Возвращает адрес страницы оплаты.
export const POST = wrap(async req => {
  const b = await body(req);
  if (!b.agree) return bad("Нужно согласие с офертой и лицензией.");
  const r = await checkout({ cart: b.cart, code: b.code, email: b.email, channel: b.channel, method: b.method, customerId: await getCustomerId(), admin: await isAdmin() });
  if (r.error) return bad(r.error);
  await addOrderAccess(r.order); // этот браузер сразу увидит оплаченный заказ
  return json(r);
});
