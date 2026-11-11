import { bad, body, json, wrap } from "@/lib/server/http";
import { adminPassword, setAdmin } from "@/lib/server/auth";
import { timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";
export const POST = wrap(async req => {
  const { password } = await body(req);
  const want = adminPassword();
  const a = Buffer.from(String(password || "")), b = Buffer.from(want);
  if (!want || a.length !== b.length || !timingSafeEqual(a, b)) {
    await new Promise(r => setTimeout(r, 600)); // замедляем подбор
    return bad("Неверный пароль", 401);
  }
  await setAdmin();
  return json({ ok: true });
});
