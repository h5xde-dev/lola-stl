// Оплата. ЮKassa, если заданы YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY.
// Без ключей: при разработке — тестовая страница оплаты; в рабочем режиме оплата выключена
// (иначе любой мог бы «оплатить» заказ кнопкой и скачать модели бесплатно).
// Тестовую оплату на рабочем сервере можно включить явно: ALLOW_TEST_PAYMENTS=on.
// Для ЮKassa заказ подтверждается только после перепроверки платежа через API (тело вебхука не доверяем).

import { randomUUID } from "node:crypto";

const API = "https://api.yookassa.ru/v3";
const shopId = () => process.env.YOOKASSA_SHOP_ID;
const key = () => process.env.YOOKASSA_SECRET_KEY;
export const provider = () => (shopId() && key() ? "yookassa"
  : process.env.NODE_ENV !== "production" || process.env.ALLOW_TEST_PAYMENTS === "on" ? "mock" : "none");

async function yk(path, { method = "GET", body, idem } = {}) {
  const r = await fetch(API + path, {
    method,
    headers: {
      Authorization: "Basic " + Buffer.from(`${shopId()}:${key()}`).toString("base64"),
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

const money = n => ({ value: (Math.round(n * 100) / 100).toFixed(2), currency: "RUB" });

// Позиции чека 54-ФЗ. Предмет расчёта — результат интеллектуальной деятельности.
// Ставка НДС: YOOKASSA_VAT_CODE (1 — без НДС, по умолчанию для ИП на УСН; уточните у бухгалтера).
function receipt(order, names, email) {
  const vat = Number(process.env.YOOKASSA_VAT_CODE || 1);
  return {
    customer: { email },
    items: order.lines.map(l => ({
      description: `STL-модель «${names[l.id] || l.id}»`.slice(0, 128),
      quantity: "1.00",
      amount: money(l.price),
      vat_code: vat,
      payment_subject: "intellectual_activity",
      payment_mode: "full_payment",
    })),
  };
}

// Создать платёж. Возвращает { id, url } — адрес страницы оплаты.
export async function createPayment(order, { code, names, email, returnUrl }) {
  if (provider() === "mock") return { id: `mock_${order.id}`, url: `/pay/mock/${code}` };
  const p = await yk("/payments", {
    method: "POST",
    idem: `order-${order.id}-${randomUUID()}`,
    body: {
      amount: money(order.total),
      capture: true,
      description: `Заказ ${code} в lola.stl`.slice(0, 128),
      confirmation: { type: "redirect", return_url: returnUrl },
      metadata: { order_id: String(order.id) },
      receipt: receipt(order, names, email),
    },
  });
  return { id: p.id, url: p.confirmation?.confirmation_url };
}

// Статус платежа из первоисточника: { paid, canceled, orderId, amount }
export async function fetchPayment(paymentId) {
  if (provider() === "mock") return null;
  const p = await yk(`/payments/${encodeURIComponent(paymentId)}`);
  return { paid: p.status === "succeeded" && p.paid, canceled: p.status === "canceled", orderId: Number(p.metadata?.order_id), amount: Number(p.amount?.value) };
}

// Кассовый чек платежа: фискальные данные для страницы чека. null — чек ещё не зарегистрирован.
export async function fetchReceipt(paymentId) {
  if (provider() !== "yookassa") return null;
  const r = await yk(`/receipts?payment_id=${encodeURIComponent(paymentId)}`);
  const x = (r.items || []).find(i => i.type === "payment" && i.status === "succeeded");
  if (!x) return null;
  return {
    id: x.id, fd: x.fiscal_document_number || "", fn: x.fiscal_storage_number || "", fp: x.fiscal_attribute || "",
    at: x.registered_at || "", provider: x.fiscal_provider_id || "",
  };
}
