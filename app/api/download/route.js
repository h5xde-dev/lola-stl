import { bad, body, json, wrap } from "@/lib/server/http";
import { clientInfo, getCustomerId, getOrderAccess } from "@/lib/server/auth";
import { orderIdFromCode } from "@/lib/server/repo";
import { issueDownload } from "@/lib/server/shop";

export const dynamic = "force-dynamic";
// Ссылка на файл на 5 минут. Сервер проверяет, что заказ открыт по его ссылке или в кабинете, и пишет журнал.
export const POST = wrap(async req => {
  const { order, model } = await body(req);
  const r = await issueDownload({ orderId: orderIdFromCode(order), modelId: String(model || ""), customerId: await getCustomerId(), access: await getOrderAccess(), info: await clientInfo() });
  if (r.error) return bad(r.error, r.status);
  return json(r);
});
