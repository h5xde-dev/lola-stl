import { adminOnly, bad, body, json, wrap } from "@/lib/server/http";
import * as R from "@/lib/server/repo";
import { resendOrderLink } from "@/lib/server/shop";

export const dynamic = "force-dynamic";
// Действия с заказом: закрыть или открыть доступ к файлам, отправить ссылку на заказ ещё раз.
export const POST = wrap(async (req, { params }) => {
  const deny = await adminOnly(); if (deny) return deny;
  const o = await R.orderById(R.orderIdFromCode((await params).id));
  if (!o) return bad("Заказ не найден", 404);
  const { action } = await body(req);
  if (action === "revoke") await R.setStatus(o.id, "revoked");
  else if (action === "open") await R.setStatus(o.id, "paid");
  else if (action === "resend") await resendOrderLink(o);
  else return bad("Неизвестное действие");
  return json({ ok: true });
});
