import { bad, body, json, wrap } from "@/lib/server/http";
import { checkAdmin, clientInfo, setAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

// Защита от подбора: не больше 5 неудачных попыток за 15 минут с одного адреса
// и не больше 30 со всех адресов вместе (на случай перебора с разных IP).
const WINDOW = 15 * 60 * 1000, PER_IP = 5, TOTAL = 30;
const fails = new Map(); // ip -> [время неудачных попыток]
const recent = ip => (fails.get(ip) || []).filter(t => Date.now() - t < WINDOW);
const totalRecent = () => [...fails.keys()].reduce((n, ip) => n + recent(ip).length, 0);

export const POST = wrap(async req => {
  const { ip } = await clientInfo();
  if (recent(ip).length >= PER_IP || totalRecent() >= TOTAL)
    return bad("Слишком много попыток входа. Попробуйте через 15 минут.", 429);
  const { login, password } = await body(req);
  if (!checkAdmin(login, password)) {
    fails.set(ip, [...recent(ip), Date.now()]);
    if (fails.size > 5000) fails.clear();
    await new Promise(r => setTimeout(r, 600)); // замедляем подбор
    return bad("Неверный логин или пароль", 401);
  }
  fails.delete(ip);
  await setAdmin();
  return json({ ok: true });
});
