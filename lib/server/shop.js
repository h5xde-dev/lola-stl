// Логика магазина на сервере: цена, заказ, оплата, выдача файлов, вход по ссылке.
// Сумму всегда считает сервер той же функцией quote(), что и корзина в браузере.

import * as R from "./repo.js";
import { nonce, sign } from "./auth.js";
import { availableMethods, createPayment, fetchReceipt } from "./pay.js";
import { methodById, mergePayments } from "../payments.js";
import { sendMail, sendTelegram } from "./notify.js";
import { downloadUrl } from "./storage.js";
import { quote, promoOn, today } from "../pricing.js";
import { SITE_URL } from "../site.js";
import { mergeCompany } from "../content.js";

// ---------- публичные данные для страниц ----------
export async function publicState() {
  const [categories, models, st, bundles] = await Promise.all([R.getCategories(), R.getPublicModels(), R.getSettings(), R.getBundles()]);
  return {
    categories, models, bundles: bundles.filter(b => b.active),
    prices: st.prices, promo: !!st.promo?.on, promoAuto: !!st.promo?.auto, promoStart: st.promo?.start, promoEnd: st.promo?.end,
    loyalty: { on: !!st.loyalty?.on, percent: st.loyalty?.percent || 0 },
    company: mergeCompany(st.company),
    payMethods: availableMethods(st), payTestAdmin: !!mergePayments(st.payments).test && mergePayments(st.payments).testFor === "admin", hasArticles: (await R.getArticles()).some(a => a.published && !a.deleted),
  };
}

// Состояние для расчёта цены конкретного покупателя: его заказы (купленное, первый заказ, лояльность),
// все промокоды и число использований введённого кода.
async function pricingState({ cart, code, customerId }) {
  const [pub, codes] = await Promise.all([publicState(), R.getPromoCodes()]);
  const mine = customerId ? await R.ordersForCustomer(customerId) : [];
  const orders = mine.map(o => ({ own: true, status: o.status, items: o.items, code: o.code, test: o.test }));
  if (code) {
    const uses = await R.codeUses(code);
    const myUses = orders.filter(o => o.code && o.code.toUpperCase() === code.toUpperCase()).length;
    for (let i = 0; i < Math.max(0, uses - myUses); i++) orders.push({ own: false, items: [], code });
  }
  const s = { ...pub, cart: (cart || []).map(String).slice(0, 200), code: String(code || "").trim().toUpperCase().slice(0, 40), promoCodes: codes, orders };
  const byId = Object.fromEntries(pub.models.map(m => [m.id, m]));
  return { s, byId, cats: pub.categories };
}

const plainQuote = Q => ({ ...Q, owned: [...Q.owned] });

export async function quoteFor(args) {
  const { s, byId, cats } = await pricingState(args);
  return plainQuote(quote(s, byId, { cats, now: today() }));
}

// ---------- заказ и оплата ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function checkout({ cart, code, email, channel, method, customerId, tgId, admin = false }) {
  email = String(email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Введите email: на него придёт чек." };
  // Покупатель: вошедший (ссылка из письма или Telegram) или найденный/созданный по email.
  // Скидка постоянного и исключение купленного — только для вошедшего, чтобы чужой email не давал скидку.
  let customer = customerId ? await R.customerById(customerId) : null;
  if (customer && !customer.email) customer = await R.linkEmail(customer, email);
  const priced = await pricingState({ cart, code, customerId: customer?.id });
  if (!customer) {
    customer = await R.customerByEmail(email, true);
    priced.s.loyalty = { on: false };
    // промокоды «один раз» и «первый заказ» проверяются по истории этого email
    const hist = await R.ordersForCustomer(customer.id);
    priced.s.orders = [...priced.s.orders.filter(o => !o.own), ...hist.map(o => ({ own: true, status: o.status, items: [], code: o.code, test: o.test }))];
  }
  const Q = quote(priced.s, priced.byId, { cats: priced.cats, now: today() });
  if (!Q.lines.length) return { error: "Корзина пуста или все модели уже куплены." };
  const settings = await R.getSettings();
  const allowed = availableMethods(settings, { admin });
  const pm = methodById(method);
  if (Q.total > 0 && !allowed.length) return { error: "Оплата пока не подключена — магазин скоро откроется. Модели можно добавить в избранное." };
  if (Q.total > 0 && (!pm || !allowed.includes(pm.id))) return { error: "Этот способ оплаты сейчас недоступен. Выберите другой." };
  const test = !!pm?.test && Q.total > 0;
  const names = Object.fromEntries(Q.lines.map(l => [l.id, priced.byId[l.id]?.name]));
  const order = await R.createOrder({
    customerId: customer.id, email, tgId, channel: channel === "tg" ? "tg" : "site",
    total: Q.total, items: Q.lines.map(l => l.id), lines: Q.lines, sets: Q.bundles.map(x => x.b.name),
    discount: Q.discount, code: Q.discount?.kind === "code" ? Q.discount.code : null, method: pm?.name || null, test,
  });
  const codeStr = R.orderCode(order.id);
  if (Q.total === 0) { await finalize(order.id); return { order: order.id, code: codeStr, url: `/checkout/return?order=${codeStr}`, total: 0 }; }
  const pay = await createPayment(order, { code: codeStr, names, email, method: pm.id, returnUrl: `${SITE_URL}/checkout/return?order=${codeStr}` });
  await R.setPayment(order.id, pay.id, pay.url);
  return { order: order.id, code: codeStr, url: pay.url, total: Q.total, codeNote: Q.codeNote };
}

// Оплата подтверждена: открываем доступ и присылаем ссылку. Повторный вызов ничего не делает.
export async function finalize(orderId) {
  const o = await R.markPaid(orderId);
  if (!o) return false;
  const customer = await R.customerById(o.customer_id);
  const code = R.orderCode(o.id);
  const orderLink = `${SITE_URL}/o/${o.token}`;
  if (o.email) {
    await sendMail(o.email, `Заказ ${code}: файлы готовы`,
      `Спасибо за покупку в lola.stl!\n\nЗаказ ${code} оплачен: ${o.items.length} мод. на ${o.total} ₽.\n\n` +
      `Ваш заказ и файлы: ${orderLink}\n\n` +
      `Это постоянная личная ссылка на этот заказ: по ней всегда можно скачать файлы и открыть чек. Сохраните письмо и не пересылайте ссылку: она личная.\n` +
      `Все заказы и чеки собраны в личном кабинете: ${SITE_URL}/account\n\n` +
      `Передавать и публиковать файлы запрещено лицензией. Кассовый чек также придёт отдельным письмом от ЮKassa.`);
  }
  const tg = o.tg_id || customer?.tg_id;
  if (tg) await sendTelegram(tg, `Заказ ${code} оплачен — ${o.items.length} мод. на ${o.total} ₽. Файлы и чек — по кнопке ниже, все заказы — в личном кабинете.`,
    { reply_markup: { inline_keyboard: [[{ text: "Открыть заказ", web_app: { url: orderLink } }], [{ text: "Личный кабинет", web_app: { url: `${SITE_URL}/account` } }]] } });
  return true;
}

// ---------- вход по ссылке из письма ----------
async function loginLink(customer) {
  if (!customer) return `${SITE_URL}/account`;
  const n = nonce();
  await R.createLoginToken(customer.id, n);
  return `${SITE_URL}/api/auth/magic?t=${encodeURIComponent(sign({ n, exp: Date.now() + 72 * 3600 * 1000 }))}`;
}
export async function sendLoginLink(email) {
  const customer = await R.customerByEmail(email);
  if (!customer) return; // не сообщаем, есть ли такой покупатель
  const link = await loginLink(customer);
  await sendMail(customer.email, "Вход в личный кабинет lola.stl",
    `Чтобы войти в личный кабинет, перейдите по ссылке: ${link}\n\nСсылка для входа действует 3 дня. После входа кабинет открыт на этом устройстве 90 дней. Если вы её не запрашивали, просто удалите письмо.`);
}

// ---------- заказы для страниц ----------
export async function serializeOrders(rows, { own = false, withLog = false } = {}) {
  const dl = await R.downloadsFor(rows.map(o => o.id));
  return rows.map(o => {
    const mine = dl.filter(d => d.order_id === o.id);
    const downloads = {};
    mine.forEach(d => { downloads[d.model_id] = (downloads[d.model_id] || 0) + 1; });
    return {
      id: R.orderCode(o.id), num: o.id, date: new Date(o.paid_at || o.created_at).getTime(), items: o.items, lines: o.lines,
      total: o.total, sets: o.sets, discount: o.discount, code: o.code || "", email: o.email, method: o.method,
      status: o.status, ch: o.channel, tg: o.tg_id ? (o.tg_name ? "@" + o.tg_name : "Telegram " + o.tg_id) : undefined, own, downloads,
      link: o.token ? `/o/${o.token}` : null, receipt: !!o.receipt, test: !!o.test,
      ...(withLog ? { log: mine.map(d => ({ id: d.model_id, at: new Date(d.at).getTime(), ua: d.ua, ip: d.ip, ch: o.channel })) } : {}),
    };
  });
}

// ---------- выдача файла ----------
// Доступ к файлам — по уникальной ссылке заказа (или из личного кабинета), без ограничения числа скачиваний.
// Каждое скачивание пишется в журнал заказа; закрыть доступ владелица может вручную в разделе «Заказы».
export async function issueDownload({ orderId, modelId, customerId, access, info }) {
  const o = await R.orderById(orderId);
  const mine = o && (o.customer_id === customerId || access.includes(o.id));
  if (!mine) return { status: 403, error: "Этот заказ открывается по личной ссылке из письма или в личном кабинете." };
  if (!["paid", "review"].includes(o.status)) return { status: 403, error: "Доступ к файлам этого заказа закрыт. Если это ошибка, напишите нам." };
  if (!o.items.includes(modelId)) return { status: 404, error: "В заказе нет такой модели." };
  const models = await R.getModelsAll();
  const m = models.find(x => x.id === modelId);
  if (!m?.fileKey) return { status: 404, error: "Файл модели ещё не загружен. Мы уже знаем и скоро исправим." };
  await R.logDownload(o.id, modelId, info.ip, info.net, info.ua);
  const ext = (m.fileKey.split(".").pop() || "stl").toLowerCase();
  return { url: await downloadUrl(m.fileKey, `${m.slug}_${R.orderCode(o.id)}.${ext}`) };
}

// Повторно отправить покупателю ссылку на заказ (письмом и в Telegram)
export async function resendOrderLink(o) {
  const code = R.orderCode(o.id), link = `${SITE_URL}/o/${o.token}`;
  if (o.email) await sendMail(o.email, `Заказ ${code}: ссылка на файлы`,
    `Ваш заказ ${code} в lola.stl: ${link}\n\nПо этой ссылке всегда можно скачать файлы и открыть чек. Все заказы — в личном кабинете: ${SITE_URL}/account`);
  const c = await R.customerById(o.customer_id);
  const tg = o.tg_id || c?.tg_id;
  if (tg) await sendTelegram(tg, `Ваш заказ ${code}: файлы и чек — по кнопке ниже.`, { reply_markup: { inline_keyboard: [[{ text: "Открыть заказ", web_app: { url: link } }]] } });
}

export const isPromoOn = promoOn;

// ---------- чек ----------
// Данные кассового чека из ЮKassa (фискальный номер и т. п.). ЮKassa регистрирует чек через несколько
// секунд после оплаты, поэтому берём его при первом открытии чека и сохраняем в заказе.
export async function receiptFor(o) {
  if (o.receipt || o.test || !o.payment_id || !o.paid_at) return o.receipt || null;
  const r = await fetchReceipt(o.payment_id).catch(() => null);
  if (r) await R.setReceipt(o.id, r);
  return r;
}
