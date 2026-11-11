import { adminOnly, json, wrap } from "@/lib/server/http";
import { outboxList } from "@/lib/server/repo";
export const dynamic = "force-dynamic";
export const GET = wrap(async () => {
  const deny = await adminOnly(); if (deny) return deny;
  return json({ items: await outboxList(60) });
});
