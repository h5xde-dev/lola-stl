import { bad, body, json, wrap } from "@/lib/server/http";
import { clientInfo, getCustomerId, getOrderAccess } from "@/lib/server/auth";
import { orderIdFromCode } from "@/lib/server/repo";
import { issueZip } from "@/lib/server/shop";

export const dynamic = "force-dynamic";
// «Скачать всё»: ссылка на ZIP-архив со всеми файлами заказа на 5 минут.
export const POST = wrap(async req => {
  const { order } = await body(req);
  const r = await issueZip({ orderId: orderIdFromCode(order), customerId: await getCustomerId(), access: await getOrderAccess(), info: await clientInfo() });
  if (r.error) return bad(r.error, r.status);
  return json(r);
});
