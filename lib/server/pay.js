// Оплата.
// Основной провайдер — интернет-эквайринг Точка Банка (платёжные ссылки с чеком 54-ФЗ), нужен TOCHKA_JWT.
// Запасной — ЮKassa (YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY). Если заданы оба, работает Точка;
// выбрать явно можно переменной PAY_PROVIDER=tochka|yookassa.
// Какие способы показывать покупателям, владелица выбирает в админке → «Оплата».
// Тестовая оплата (без денег) включается там же: только для владелицы или для всех посетителей.
// При разработке и с ALLOW_TEST_PAYMENTS=on тестовая оплата доступна всем — для автопроверок.
// Заказ подтверждается только после перепроверки платежа через API провайдера (телу уведомления не доверяем).

import { createPublicKey, randomUUID, verify as cryptoVerify } from "node:crypto";
import { readFileSync } from "node:fs";
import { methodById, methodFor, mergePayments, PAY_METHODS } from "../payments.js";
import { getSettings, orderIdFromCode, setSettings } from "./repo.js";

const envTest = () => process.env.NODE_ENV !== "production" || process.env.ALLOW_TEST_PAYMENTS === "on";
const round2 = n => Math.round(Number(n) * 100) / 100;

// ---------- какой провайдер работает ----------
const shopId = () => process.env.YOOKASSA_SHOP_ID;
const ykKey = () => process.env.YOOKASSA_SECRET_KEY;
export const yookassaReady = () => !!(shopId() && ykKey());
export const tochkaReady = () => !!process.env.TOCHKA_JWT;
export function activeProvider() {
  const want = process.env.PAY_PROVIDER;
  if (want === "yookassa") return yookassaReady() ? "yookassa" : null;
  if (want === "tochka") return tochkaReady() ? "tochka" : null;
  return tochkaReady() ? "tochka" : yookassaReady() ? "yookassa" : null;
}
// Для раздела «Сервисы» в админке
export const provider = () => activeProvider() || (envTest() ? "mock" : "none");

// Тестовая оплата сейчас разрешена этому посетителю?
export function testAllowed(settings, { admin = false } = {}) {
  if (envTest()) return true;
  const p = mergePayments(settings?.payments);
  return !!p.test && (p.testFor === "all" || admin);
}
// Включена ли тестовая оплата вообще (для страницы тестовой оплаты)
export const testEnabled = settings => envTest() || !!mergePayments(settings?.payments).test;

// Способы оплаты, доступные посетителю: включённые в админке и реально работающие у провайдера.
// Для Точки дополнительно учитываются способы, подключённые у торговой точки (из «Проверить соединение»).
export function availableMethods(settings, { admin = false } = {}) {
  const p = mergePayments(settings?.payments);
  const prov = activeProvider();
  const modes = prov === "tochka" && Array.isArray(settings?.tochka?.modes) && settings.tochka.modes.length ? settings.tochka.modes : null;
  return PAY_METHODS.filter(m => {
    if (m.test) return testAllowed(settings, { admin });
    return !!prov && p[m.id] && methodFor(m, prov) && (!modes || modes.includes(m.tochka));
  }).map(m => m.id);
}

// ---------- ЮKassa ----------
async function yk(path, { method = "GET", body, idem } = {}) {
  const r = await fetch("https://api.yookassa.ru/v3" + path, {
    method,
    headers: {
      Authorization: "Basic " + Buffer.from(`${shopId()}:${ykKey()}`).toString("base64"),
      "Content-Type": "application/json",
      ...(idem ? { "Idempotence-Key": idem } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`ЮKassa ${r.status}: ${data.description || data.code || "ошибка"}`);
  return data;
}
const money = n => ({ value: round2(n).toFixed(2), currency: "RUB" });
const itemName = (names, id) => `STL-модель «${names[id] || id}»`.slice(0, 128);

// Позиции чека: одна строка на модель, цена — доля итога (подарки и скидки уже распределены в order.lines).
// Строки с нулевой ценой в чек не попадают; если сумма строк разошлась с итогом из-за копеек, правим последнюю.
function receiptLines(order) {
  const lines = order.lines.filter(l => round2(l.price) > 0).map(l => ({ id: l.id, price: round2(l.price) }));
  const diff = round2(order.total - lines.reduce((a, l) => a + l.price, 0));
  if (lines.length && diff) lines[lines.length - 1].price = round2(lines[lines.length - 1].price + diff);
  return lines;
}

function ykReceipt(order, names, email) {
  const vat = Number(process.env.YOOKASSA_VAT_CODE || 1);
  return {
    customer: { email },
    items: receiptLines(order).map(l => ({
      description: itemName(names, l.id), quantity: "1.00", amount: money(l.price), vat_code: vat,
      payment_subject: "intellectual_activity", payment_mode: "full_payment",
    })),
  };
}

// ---------- Точка Банк ----------
// Сертификаты Минцифры для enter.tochka.com добавлены в образ (Dockerfile, NODE_EXTRA_CA_CERTS).
const T_API = () => (process.env.TOCHKA_API || "https://enter.tochka.com/uapi").replace(/\/$/, "");

function tochkaError(data) {
  if (!data || typeof data !== "object") return "";
  const errs = data.Errors || data.errors;
  if (Array.isArray(errs) && errs.length) return errs.map(e => e.message || e.errorCode || JSON.stringify(e)).join("; ");
  return data.message || data.detail?.toString?.() || data.code || "";
}
async function tc(path, { method = "GET", body } = {}) {
  const r = await fetch(T_API() + path, {
    method,
    headers: { Authorization: "Bearer " + process.env.TOCHKA_JWT, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Точка ${r.status}: ${tochkaError(data) || "ошибка"}`);
  return data;
}

// customerCode и merchantId: из переменных окружения или один раз из API (кешируются в настройках).
export async function tochkaInfo({ refresh = false } = {}) {
  const saved = (await getSettings()).tochka || {};
  if (!refresh && saved.customerCode && saved.merchantId) {
    return { ...saved, customerCode: process.env.TOCHKA_CUSTOMER_CODE || saved.customerCode, merchantId: process.env.TOCHKA_MERCHANT_ID || saved.merchantId };
  }
  let customerCode = process.env.TOCHKA_CUSTOMER_CODE || "";
  let company = "";
  if (!customerCode || refresh) {
    const c = await tc("/open-banking/v1.0/customers");
    const biz = (c.Data?.Customer || []).find(x => x.customerType === "Business");
    if (!biz && !customerCode) throw new Error("В Точке не найден бизнес-клиент: проверьте разрешение ReadCustomerData у JWT-ключа.");
    customerCode = customerCode || biz.customerCode;
    company = biz?.shortName || biz?.fullName || "";
  }
  const r = await tc(`/acquiring/v1.0/retailers?customerCode=${encodeURIComponent(customerCode)}`);
  const list = r.Data?.Retailer || [];
  const want = process.env.TOCHKA_MERCHANT_ID;
  const ret = (want && list.find(x => x.merchantId === want)) || list.find(x => x.status === "REG" && x.isActive) || null;
  const info = {
    customerCode, company, merchantId: want || ret?.merchantId || "",
    ready: !!ret && ret.status === "REG" && !!ret.isActive,
    status: ret?.status || (list.length ? list[0].status : "нет торговой точки"),
    name: ret?.name || "", url: ret?.url || "", rate: ret?.rate ?? null, cashbox: ret?.cashbox || "",
    modes: ret?.paymentModes || [], mcc: ret?.mcc || "",
    webhook: saved.webhook || null, checkedAt: new Date().toISOString(),
  };
  await setSettings({ tochka: info });
  return info;
}

// Подписаться на уведомления об оплате по платёжным ссылкам. client_id показан рядом с JWT-ключом в интернет-банке.
export async function tochkaWebhook(url) {
  const clientId = process.env.TOCHKA_CLIENT_ID;
  if (!clientId) throw new Error("Не задан TOCHKA_CLIENT_ID — он показан рядом с JWT-ключом в интернет-банке.");
  const path = `/webhook/v1.0/${encodeURIComponent(clientId)}`;
  const body = { webhooksList: ["acquiringInternetPayment"], url };
  // Вебхук уже был — меняем адрес, иначе создаём
  try { await tc(path, { method: "PUT", body }); }
  catch (e) { if (/40[09]/.test(e.message)) await tc(path, { method: "POST", body }); else throw e; }
  const saved = (await getSettings()).tochka || {};
  await setSettings({ tochka: { ...saved, webhook: { url, at: new Date().toISOString() } } });
  return true;
}

// Публичный ключ Точки для подписи вебхуков (JWK). Для автотестов: TOCHKA_PUBLIC_KEY — JWK или путь к файлу с ним.
let keyCache = { key: null, at: 0 };
function jwkToKey(j) {
  const jwk = Array.isArray(j?.keys) ? j.keys[0] : j;
  return createPublicKey({ key: jwk, format: "jwk" });
}
async function tochkaKey(force = false) {
  const env = process.env.TOCHKA_PUBLIC_KEY;
  if (env) return jwkToKey(JSON.parse(env.trim().startsWith("{") ? env : readFileSync(env, "utf8")));
  if (!force && keyCache.key && Date.now() - keyCache.at < 24 * 3600 * 1000) return keyCache.key;
  const r = await fetch("https://enter.tochka.com/doc/openapi/static/keys/public", { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error("Не удалось получить ключ Точки: " + r.status);
  const key = jwkToKey(await r.json());
  keyCache = { key, at: Date.now() };
  return key;
}
// Тело вебхука — JWT (RS256). Возвращает содержимое или null, если подпись не сходится.
export async function verifyTochkaWebhook(token) {
  const parts = String(token || "").trim().split(".");
  if (parts.length !== 3) return null;
  let header;
  try { header = JSON.parse(Buffer.from(parts[0], "base64url").toString()); } catch { return null; }
  if (header.alg !== "RS256") return null;
  const data = Buffer.from(parts[0] + "." + parts[1]), sig = Buffer.from(parts[2], "base64url");
  for (const force of [false, true]) {
    const key = await tochkaKey(force);
    if (cryptoVerify("RSA-SHA256", data, key, sig)) {
      try { return JSON.parse(Buffer.from(parts[1], "base64url").toString()); } catch { return null; }
    }
    if (process.env.TOCHKA_PUBLIC_KEY) break; // ключ задан явно — перезапрашивать нечего
  }
  return null;
}

// ---------- общие операции ----------
// Создать платёж. Возвращает { id, url } — адрес страницы оплаты.
export async function createPayment(order, { code, names, email, returnUrl, method }) {
  const m = methodById(method);
  if (m?.test) return { id: `mock_${order.id}`, url: `/pay/mock/${code}` };
  const prov = activeProvider();
  if (prov === "tochka") {
    const t = await tochkaInfo();
    const tax = process.env.TOCHKA_TAX_SYSTEM; // osn | usn_income | usn_income_outcome | esn | patent
    const r = await tc("/acquiring/v1.0/payments_with_receipt", {
      method: "POST",
      body: {
        Data: {
          customerCode: t.customerCode,
          ...(t.merchantId ? { merchantId: t.merchantId } : {}),
          amount: round2(order.total),
          // Точка сама добавляет в начало назначения «Заказ <paymentLinkId>: »
          purpose: "STL-модели lola.stl",
          paymentMode: [m.tochka],
          redirectUrl: returnUrl,
          failRedirectUrl: returnUrl + (returnUrl.includes("?") ? "&" : "?") + "fail=1",
          paymentLinkId: code,
          ...(tax ? { taxSystemCode: tax } : {}),
          Client: { email },
          Items: receiptLines(order).map(l => ({
            name: itemName(names, l.id), amount: l.price, quantity: 1,
            vatType: process.env.TOCHKA_VAT || "none", paymentMethod: "full_payment",
            paymentObject: process.env.TOCHKA_PAYMENT_OBJECT || "service", measure: "шт.",
          })),
        },
      },
    });
    const d = r.Data || {};
    if (!d.operationId || !d.paymentLink) throw new Error("Точка не вернула ссылку на оплату");
    return { id: d.operationId, url: d.paymentLink };
  }
  if (prov === "yookassa") {
    const p = await yk("/payments", {
      method: "POST",
      idem: `order-${order.id}-${randomUUID()}`,
      body: {
        amount: money(order.total),
        capture: true,
        description: `Заказ ${code} в lola.stl`.slice(0, 128),
        confirmation: { type: "redirect", return_url: returnUrl },
        ...(m?.yk ? { payment_method_data: { type: m.yk } } : {}),
        metadata: { order_id: String(order.id) },
        receipt: ykReceipt(order, names, email),
      },
    });
    return { id: p.id, url: p.confirmation?.confirmation_url };
  }
  throw new Error("Оплата не подключена");
}

// Статус платежа из первоисточника: { paid, canceled, refunded, orderId, amount }
export async function fetchPayment(paymentId) {
  if (!paymentId || String(paymentId).startsWith("mock_")) return null;
  const prov = activeProvider();
  if (prov === "tochka") {
    const r = await tc(`/acquiring/v1.0/payments/${encodeURIComponent(paymentId)}`);
    const op = (r.Data?.Operation || [])[0];
    if (!op) return null;
    return {
      paid: ["APPROVED", "ON-REFUND", "REFUNDED", "REFUNDED_PARTIALLY"].includes(op.status),
      canceled: op.status === "EXPIRED",
      refunded: ["REFUNDED", "REFUNDED_PARTIALLY", "ON-REFUND"].includes(op.status),
      orderId: orderIdFromCode(op.paymentLinkId || ""), amount: Number(op.amount), status: op.status, type: op.paymentType || "",
    };
  }
  if (prov === "yookassa") {
    const p = await yk(`/payments/${encodeURIComponent(paymentId)}`);
    return { paid: p.status === "succeeded" && p.paid, canceled: p.status === "canceled", refunded: Number(p.refunded_amount?.value) > 0, orderId: Number(p.metadata?.order_id), amount: Number(p.amount?.value), status: p.status };
  }
  return null;
}

// Вернуть деньги за заказ полностью. Чек возврата формирует касса провайдера.
export async function refundPayment(order, { names = {} } = {}) {
  if (order.test || String(order.payment_id || "").startsWith("mock_")) return { ok: true, test: true };
  const prov = activeProvider();
  if (!order.payment_id || !prov) throw new Error("У заказа нет платежа, который можно вернуть");
  if (prov === "tochka") {
    const r = await tc(`/acquiring/v1.0/payments/${encodeURIComponent(order.payment_id)}/refund`, { method: "POST", body: { Data: { amount: round2(order.total) } } });
    if (r.Data && r.Data.isRefund === false) throw new Error("Точка не приняла возврат");
    return { ok: true, id: r.Data?.orderId || "" };
  }
  const r = await yk("/refunds", {
    method: "POST", idem: `refund-${order.id}`,
    body: { payment_id: order.payment_id, amount: money(order.total), receipt: ykReceipt(order, names, order.email) },
  });
  return { ok: r.status !== "canceled", id: r.id };
}

// Кассовый чек платежа: фискальные данные для страницы чека. null — данных нет
// (у Точки чек присылает партнёр по фискализации прямо на email покупателя).
export async function fetchReceipt(paymentId) {
  if (activeProvider() !== "yookassa" || String(paymentId).startsWith("mock_")) return null;
  const r = await yk(`/receipts?payment_id=${encodeURIComponent(paymentId)}`);
  const x = (r.items || []).find(i => i.type === "payment" && i.status === "succeeded");
  if (!x) return null;
  return {
    id: x.id, fd: x.fiscal_document_number || "", fn: x.fiscal_storage_number || "", fp: x.fiscal_attribute || "",
    at: x.registered_at || "", provider: x.fiscal_provider_id || "",
  };
}
