import { adminOnly, json, wrap } from "@/lib/server/http";
import { analytics } from "@/lib/server/analytics";
import { cancelStale } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
// ?days=7|30|90|365, 0 — за всё время
export const GET = wrap(async req => {
  const deny = await adminOnly(); if (deny) return deny;
  await cancelStale();
  const d = Number(new URL(req.url).searchParams.get("days") ?? 30);
  return json(await analytics([0, 7, 30, 90, 365].includes(d) ? d : 30));
});
