import { adminOnly, bad, body, json, wrap } from "@/lib/server/http";
import * as R from "@/lib/server/repo";
import { sendLoginLink } from "@/lib/server/shop";
import { sendTelegram } from "@/lib/server/notify";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
// Действия с заказом: сброс лимита, проверка, закрыть или открыть доступ, повторная ссылка.
export const POST = wrap(async (req, { params }) => {
  const deny = await adminOnly(); if (deny) return deny;
  const o = await R.orderById(R.orderIdFromCode((await params).id));
  if (!o) return bad("Заказ не найден", 404);
  const { action } = await body(req);
  if (action === "reset") await R.resetDownloads(o.id);
  else if (action === "review") await R.setStatus(o.id, "review");
  else if (action === "revoke") await R.setStatus(o.id, "revoked");
  else if (action === "open") await R.setStatus(o.id, "paid");
  else if (action === "resend") {
    if (o.email) await sendLoginLink(o.email);
    const c = await R.customerById(o.customer_id);
    if (c?.tg_id) await sendTelegram(c.tg_id, `Ваши покупки в lola.stl: ${SITE_URL}/purchases`);
  } else return bad("Неизвестное действие");
  return json({ ok: true });
});
