import { bad, body, json, wrap } from "@/lib/server/http";
import { checkTelegram, setCustomer } from "@/lib/server/auth";
import { customerByTg } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
// Вход из Telegram Mini App: подпись initData проверяется токеном бота.
export const POST = wrap(async req => {
  const { initData } = await body(req);
  const user = checkTelegram(initData);
  if (!user?.id) return bad("Не удалось подтвердить вход через Telegram", 401);
  const c = await customerByTg(user.id, user.username || [user.first_name, user.last_name].filter(Boolean).join(" "));
  await setCustomer(c.id);
  return json({ ok: true, tg: c.tg_name });
});
