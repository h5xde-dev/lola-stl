import { bad, body, json, wrap } from "@/lib/server/http";
import { getOrderAccess } from "@/lib/server/auth";
import { orderById, orderIdFromCode, setStatus } from "@/lib/server/repo";
import { provider } from "@/lib/server/pay";
import { finalize } from "@/lib/server/shop";

export const dynamic = "force-dynamic";
// Тестовая оплата: работает, только пока не подключена ЮKassa.
export const POST = wrap(async req => {
  if (provider() !== "mock") return bad("Тестовая оплата отключена", 404);
  const { order, action } = await body(req);
  const id = orderIdFromCode(order);
  const o = await orderById(id);
  if (!o || !(await getOrderAccess()).includes(o.id)) return bad("Заказ не найден", 404);
  if (action === "cancel") { if (o.status === "pending") await setStatus(o.id, "canceled"); return json({ status: "canceled" }); }
  await finalize(o.id);
  return json({ status: "paid" });
});
