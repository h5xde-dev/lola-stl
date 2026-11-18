import { verify } from "@/lib/server/auth";
import { checkPendingPayments } from "@/lib/server/shop";

export const dynamic = "force-dynamic";
// Фоновая проверка неоплаченных заказов у банка. Вызывается из instrumentation.js раз в минуту
// с подписанным ключом. ?all=1 — заодно заказы, отменённые по таймеру, за последние 7 дней.
export async function POST(req) {
  if (verify(req.headers.get("x-key"))?.purpose !== "payments") return new Response("forbidden", { status: 403 });
  const all = new URL(req.url).searchParams.get("all") === "1";
  try { return Response.json({ ok: true, paid: await checkPendingPayments({ recentOnly: !all }) }); }
  catch (e) { console.error("payments check:", e.message); return Response.json({ ok: false }, { status: 500 }); }
}
