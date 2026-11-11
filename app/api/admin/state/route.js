import { adminOnly, body, json, wrap } from "@/lib/server/http";
import * as R from "@/lib/server/repo";
import { serializeOrders } from "@/lib/server/shop";
import { provider } from "@/lib/server/pay";
import { mailConfigured } from "@/lib/server/notify";
import { s3Configured } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

// Всё, с чем работает админка: каталог целиком (со скрытыми), настройки, промокоды, наборы, заказы.
export const GET = wrap(async () => {
  const deny = await adminOnly(); if (deny) return deny;
  await R.cancelStale();
  const [categories, models, st, promoCodes, bundles, orders] = await Promise.all([
    R.getCategories(), R.getModelsAll(), R.getSettings(), R.getPromoCodes(), R.getBundles(), R.allOrders(),
  ]);
  return json({
    categories, models, promoCodes, bundles,
    prices: st.prices, promo: !!st.promo?.on, promoAuto: !!st.promo?.auto, promoStart: st.promo?.start, promoEnd: st.promo?.end,
    loyalty: st.loyalty, downloadLimit: st.downloads?.limit || 5, downloadNets: st.downloads?.nets || 3,
    orders: (await serializeOrders(orders.filter(o => o.status !== "pending"), { withLog: true })),
    pendingOrders: orders.filter(o => o.status === "pending").length,
    services: { payments: provider(), mail: mailConfigured() ? "smtp" : "journal", storage: s3Configured() ? "s3" : "local", telegram: !!process.env.TELEGRAM_BOT_TOKEN, db: process.env.DATABASE_URL ? "postgres" : "pglite" },
  });
});

// Сохранение изменений: приходят только изменившиеся разделы.
export const PUT = wrap(async req => {
  const deny = await adminOnly(); if (deny) return deny;
  const b = await body(req);
  if (Array.isArray(b.categories)) await R.saveCategories(b.categories);
  if (Array.isArray(b.models)) await R.saveModels(b.models);
  if (Array.isArray(b.promoCodes)) await R.savePromoCodes(b.promoCodes);
  if (Array.isArray(b.bundles)) await R.saveBundles(b.bundles);
  const st = {};
  if (b.prices) st.prices = b.prices;
  if ("promo" in b || "promoAuto" in b || "promoStart" in b || "promoEnd" in b) {
    const cur = (await R.getSettings()).promo || {};
    st.promo = { on: "promo" in b ? !!b.promo : cur.on, auto: "promoAuto" in b ? !!b.promoAuto : cur.auto, start: b.promoStart ?? cur.start, end: b.promoEnd ?? cur.end };
  }
  if (b.loyalty) st.loyalty = { on: !!b.loyalty.on, percent: Math.max(0, Math.min(99, Math.round(+b.loyalty.percent || 0))) };
  if ("downloadLimit" in b) {
    const cur = (await R.getSettings()).downloads || {};
    st.downloads = { ...cur, limit: Math.max(1, Math.min(50, Math.round(+b.downloadLimit || 5))) };
  }
  if (Object.keys(st).length) await R.setSettings(st);
  return json({ ok: true });
});
