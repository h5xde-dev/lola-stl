import { revalidatePath } from "next/cache";
import { adminOnly, body, json, wrap } from "@/lib/server/http";
import * as R from "@/lib/server/repo";
import { serializeOrders } from "@/lib/server/shop";
import { provider } from "@/lib/server/pay";
import { mailProvider } from "@/lib/server/notify";
import { deleteFile, s3Configured } from "@/lib/server/storage";
import { mergeCompany, mergeHome, mergeSeo } from "@/lib/content";
import { mergePayments, PAY_METHODS } from "@/lib/payments";
import { yookassaReady } from "@/lib/server/pay";

export const dynamic = "force-dynamic";

// Всё, с чем работает админка: каталог целиком (со скрытыми), настройки, промокоды, наборы, заказы.
export const GET = wrap(async () => {
  const deny = await adminOnly(); if (deny) return deny;
  await R.cancelStale();
  const [categories, models, st, promoCodes, bundles, orders, articles] = await Promise.all([
    R.getCategories(), R.getModelsAll(), R.getSettings(), R.getPromoCodes(), R.getBundles(), R.allOrders(), R.getArticles(),
  ]);
  return json({
    categories, models, promoCodes, bundles, articles,
    home: mergeHome(st.home), seo: mergeSeo(st.seo), company: mergeCompany(st.company), payments: mergePayments(st.payments),
    prices: st.prices, promo: !!st.promo?.on, promoAuto: !!st.promo?.auto, promoStart: st.promo?.start, promoEnd: st.promo?.end,
    loyalty: st.loyalty,
    orders: (await serializeOrders(orders.filter(o => o.status !== "pending"), { withLog: true })),
    pendingOrders: orders.filter(o => o.status === "pending").length,
    testOrders: orders.filter(o => o.test).length,
    services: { yookassa: yookassaReady(), payments: provider(), mail: mailProvider() || "journal", storage: s3Configured() ? "s3" : "local", telegram: !!process.env.TELEGRAM_BOT_TOKEN, db: process.env.DATABASE_URL ? "postgres" : "pglite" },
  });
});

// Сохранение изменений: приходят только изменившиеся разделы.
export const PUT = wrap(async req => {
  const deny = await adminOnly(); if (deny) return deny;
  const b = await body(req);
  if (Array.isArray(b.categories)) await R.saveCategories(b.categories);
  if (Array.isArray(b.models)) {
    // Модель получила новый файл — старый удаляем из хранилища. Файлы удалённых моделей остаются:
    // те, кто их купил, сохраняют доступ.
    const before = await R.getModelsAll();
    await R.saveModels(b.models);
    const used = new Set(b.models.map(m => m.fileKey).filter(Boolean));
    const replaced = before.filter(o => o.fileKey && !used.has(o.fileKey) && b.models.some(m => m.id === o.id && !m.deleted && m.fileKey && m.fileKey !== o.fileKey));
    await Promise.all(replaced.map(o => deleteFile(o.fileKey)));
  }
  if (Array.isArray(b.promoCodes)) await R.savePromoCodes(b.promoCodes);
  if (Array.isArray(b.bundles)) await R.saveBundles(b.bundles);
  if (Array.isArray(b.articles)) await R.saveArticles(b.articles);
  const st = {};
  const obj = v => v && typeof v === "object" && !Array.isArray(v);
  if (obj(b.home)) st.home = b.home;
  if (obj(b.seo)) st.seo = Object.fromEntries(Object.entries(b.seo).map(([k, v]) => [k, String(v ?? "").slice(0, 2000)]));
  if (obj(b.payments)) st.payments = { ...Object.fromEntries(PAY_METHODS.map(m => [m.id, !!b.payments[m.id]])), testFor: b.payments.testFor === "all" ? "all" : "admin" };
  if (obj(b.company)) st.company = Object.fromEntries(Object.entries(b.company).map(([k, v]) => [k, String(v ?? "").slice(0, 300)]));
  if (b.prices) st.prices = b.prices;
  if ("promo" in b || "promoAuto" in b || "promoStart" in b || "promoEnd" in b) {
    const cur = (await R.getSettings()).promo || {};
    st.promo = { on: "promo" in b ? !!b.promo : cur.on, auto: "promoAuto" in b ? !!b.promoAuto : cur.auto, start: b.promoStart ?? cur.start, end: b.promoEnd ?? cur.end };
  }
  if (b.loyalty) st.loyalty = { on: !!b.loyalty.on, percent: Math.max(0, Math.min(99, Math.round(+b.loyalty.percent || 0))) };
  if (Object.keys(st).length) await R.setSettings(st);
  R.invalidate();              // кеш данных в памяти
  revalidatePath("/", "layout"); // кеш готовых страниц — сайт сразу показывает новые цены, акции и модели
  return json({ ok: true });
});
