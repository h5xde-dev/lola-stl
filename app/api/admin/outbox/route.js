import { adminOnly, json, wrap } from "@/lib/server/http";
import { outboxList, outboxStats } from "@/lib/server/repo";
export const dynamic = "force-dynamic";
// Журнал писем и сообщений бота со сводкой. ?failed=1 — только неотправленные.
export const GET = wrap(async req => {
  const deny = await adminOnly(); if (deny) return deny;
  const failed = new URL(req.url).searchParams.get("failed") === "1";
  return json({ items: await outboxList(200, failed), stats: await outboxStats() });
});
