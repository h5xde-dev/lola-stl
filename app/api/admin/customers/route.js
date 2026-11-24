import { adminOnly, bad, body, json, wrap } from "@/lib/server/http";
import { customersList } from "@/lib/server/repo";
import { adminLoginLink } from "@/lib/server/shop";

export const dynamic = "force-dynamic";
// Покупатели для админки и ссылка для входа в их кабинет.
export const GET = wrap(async () => {
  const deny = await adminOnly(); if (deny) return deny;
  const rows = await customersList();
  return json({ items: rows.map(r => ({ id: r.id, email: r.email, tg: r.tg_id ? (r.tg_name ? "@" + r.tg_name : "Telegram") : null, since: new Date(r.created_at).getTime(),
    paid: r.paid, spent: r.spent, last: r.last_paid ? new Date(r.last_paid).getTime() : null, codes: r.codes, pending: r.pending })) });
});
// { id, action: "send" | "link" } — отправить ссылку для входа покупателю или получить её для пересылки
export const POST = wrap(async req => {
  const deny = await adminOnly(); if (deny) return deny;
  const { id, action } = await body(req);
  const r = await adminLoginLink(Number(id), { send: action === "send" });
  if (r.error) return bad(r.error, r.status);
  return json(r);
});
