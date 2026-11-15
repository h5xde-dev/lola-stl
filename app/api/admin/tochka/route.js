import { adminOnly, bad, body, json, wrap } from "@/lib/server/http";
import { activeProvider, tochkaInfo, tochkaReady, tochkaWebhook } from "@/lib/server/pay";
import { getSettings } from "@/lib/server/repo";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

// Состояние подключения Точки для админки → «Оплата»
export const GET = wrap(async () => {
  const deny = await adminOnly(); if (deny) return deny;
  const st = await getSettings();
  return json({ jwt: tochkaReady(), clientId: !!process.env.TOCHKA_CLIENT_ID, active: activeProvider() === "tochka", info: st.tochka || null, webhookUrl: `${SITE_URL}/api/tochka/webhook` });
});

// action: "check" — запросить торговую точку и способы оплаты; "webhook" — подключить уведомления об оплате
export const POST = wrap(async req => {
  const deny = await adminOnly(); if (deny) return deny;
  if (!tochkaReady()) return bad("На сервере не задан TOCHKA_JWT.");
  const { action } = await body(req);
  try {
    if (action === "check") return json({ ok: true, info: await tochkaInfo({ refresh: true }) });
    if (action === "webhook") { await tochkaWebhook(`${SITE_URL}/api/tochka/webhook`); return json({ ok: true, info: (await getSettings()).tochka }); }
  } catch (e) { return bad(e.message); }
  return bad("Неизвестное действие");
});
