import { bad, body, json, wrap } from "@/lib/server/http";
import { addOrderAccess, clientInfo, getCustomerId, isAdmin } from "@/lib/server/auth";
import { checkout } from "@/lib/server/shop";
import { LEGAL_VERSION } from "@/lib/legal";

export const dynamic = "force-dynamic";
// Создаёт заказ и платёж. Возвращает адрес страницы оплаты.
export const POST = wrap(async req => {
  const b = await body(req);
  if (!b.agree) return bad("Нужно принять условия оферты.");
  if (!b.pd) return bad("Нужно согласие на обработку персональных данных: без email мы не сможем прислать чек и файлы.");
  const consents = { offer: true, pd: true, version: LEGAL_VERSION, at: new Date().toISOString(), ip: (await clientInfo()).ip };
  const r = await checkout({ cart: b.cart, code: b.code, email: b.email, channel: b.channel, method: b.method, customerId: await getCustomerId(), admin: await isAdmin(), consents });
  if (r.error) return bad(r.error);
  await addOrderAccess(r.order); // этот браузер сразу увидит оплаченный заказ
  return json(r);
});
