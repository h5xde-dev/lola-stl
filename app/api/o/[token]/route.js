import { bad, json, wrap } from "@/lib/server/http";
import { addOrderAccess } from "@/lib/server/auth";
import { orderByToken } from "@/lib/server/repo";
import { serializeOrders } from "@/lib/server/shop";

export const dynamic = "force-dynamic";
// Постоянная личная ссылка на заказ: открывает заказ на этом устройстве (кука доступа к заказу)
// и возвращает его для страницы. Скачивания по-прежнему идут через лимиты и журнал.
export const GET = wrap(async (req, { params }) => {
  const o = await orderByToken((await params).token);
  if (!o || o.status === "canceled") return bad("Заказ не найден. Проверьте ссылку из письма.", 404);
  if (o.status === "pending") return json({ pending: true, url: o.payment_url });
  await addOrderAccess(o.id);
  const [order] = await serializeOrders([o], { own: true });
  return json({ order });
});
