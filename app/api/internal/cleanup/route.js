import { verify } from "@/lib/server/auth";
import { purgeExpired } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
// Удаление данных по истечении сроков хранения из Политики. Вызывается из instrumentation.js
// через минуту после запуска и затем раз в 6 часов, с подписанным ключом.
export async function POST(req) {
  if (verify(req.headers.get("x-key"))?.purpose !== "cleanup") return new Response("forbidden", { status: 403 });
  try {
    const r = await purgeExpired();
    if (Object.values(r).some(Boolean)) console.log("cleanup:", JSON.stringify(r));
    return Response.json({ ok: true, ...r });
  } catch (e) { console.error("cleanup:", e.message); return Response.json({ ok: false }, { status: 500 }); }
}
