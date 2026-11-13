import { bad, body, json, wrap } from "@/lib/server/http";
import { getOrderAccess } from "@/lib/server/auth";
import { getSettings, orderById, orderIdFromCode, setStatus } from "@/lib/server/repo";
import { testEnabled } from "@/lib/server/pay";
import { finalize } from "@/lib/server/shop";

export const dynamic = "force-dynamic";
// Тестовая оплата: только для заказов, оформленных тестовым способом, и пока он включён в админке.
export const POST = wrap(async req => {
  if (!testEnabled(await getSettings())) return bad("Тестовая оплата отключена", 404);
  const { order, action } = await body(req);
  const o = await orderById(orderIdFromCode(order));
  if (!o || !o.test || !(await getOrderAccess()).includes(o.id)) return bad("Заказ не найден", 404);
  if (action === "cancel") { if (o.status === "pending") await setStatus(o.id, "canceled"); return json({ status: "canceled" }); }
  await finalize(o.id);
  return json({ status: "paid" });
});
