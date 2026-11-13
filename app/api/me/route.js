import { json, wrap } from "@/lib/server/http";
import { getCustomerId, getOrderAccess, isAdmin } from "@/lib/server/auth";
import { customerById, ordersForCustomer } from "@/lib/server/repo";
import { serializeOrders } from "@/lib/server/shop";

export const dynamic = "force-dynamic";
// «Мои покупки»: заказы вошедшего покупателя и оплаченные в этом браузере.
export const GET = wrap(async () => {
  const cid = await getCustomerId(), access = await getOrderAccess();
  const c = await customerById(cid);
  const rows = await ordersForCustomer(c?.id, access);
  return json({ admin: await isAdmin(), customer: c ? { email: c.email, tg: c.tg_name || (c.tg_id ? "Telegram" : null) } : null, orders: await serializeOrders(rows, { own: true }) });
});
