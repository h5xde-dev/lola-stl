// Логика магазина на сервере: цена, заказ, оплата, выдача файлов, вход по ссылке.
// Сумму всегда считает сервер той же функцией quote(), что и корзина в браузере.

import * as R from "./repo.js";
import { nonce, sign } from "./auth.js";
import { activeProvider, availableMethods, createPayment, fetchPayment, fetchReceipt, refundPayment } from "./pay.js";
import { methodById, mergePayments } from "../payments.js";
import { sendMail, sendTelegram } from "./notify.js";
import { downloadUrl } from "./storage.js";
import { quote, promoOn, today } from "../pricing.js";
import { SITE_URL } from "../site.js";
import { mergeCompany, mergeHome } from "../content.js";
import { modelFiles, publicModel } from "../models.js";

// ---------- публичные данные для страниц ----------

export async function publicState() {
  const [categories, models, st, bundles] = await Promise.all([R.getCategories(), R.getPublicModels(), R.getSettings(), R.getBundles()]);
  return {
    categories, models: models.map(publicModel), bundles: bundles.filter(b => b.active),
    prices: st.prices, promo: !!st.promo?.on, promoAuto: !!st.promo?.auto, promoStart: st.promo?.start, promoEnd: st.promo?.end,
    loyalty: { on: !!st.loyalty?.on, percent: st.loyalty?.percent || 0 },
    // Адрес ИП (домашний) в общие данные страниц не попадает: он нужен только на «Контактах», в оферте и в чеке
    company: (({ address, ...c }) => c)(mergeCompany(st.company)),
    sections: mergeHome(st.home).sections,
    payMethods: availableMethods(st), payTestAdmin: !!mergePayments(st.payments).test && mergePayments(st.payments).testFor === "admin", hasArticles: (await R.getArticles()).some(a => a.published && !a.deleted),
  };
}

// Состояние для расчёта цены конкретного покупателя: его заказы (купленное, первый заказ, лояльность),
// все промокоды и число использований введённого кода.
async function pricingState({ cart, code, customerId }) {
  const [pub, codes] = await Promise.all([publicState(), R.getPromoCodes()]);
  const mine = customerId ? await R.ordersForCustomer(customerId) : [];
  const orders = mine.map(o => ({ own: true, status: o.status, items: o.items, code: o.code, test: o.test, total: o.total }));
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

export async function checkout({ cart, code, email, channel, method, customerId, tgId, admin = false, consents = null }) {
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
    priced.s.orders = [...priced.s.orders.filter(o => !o.own), ...hist.map(o => ({ own: true, status: o.status, items: [], code: o.code, test: o.test, total: o.total }))];
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
    discount: Q.discount, code: Q.discount?.kind === "code" ? Q.discount.code : null, method: pm?.name || null, test, consents,
  });
  const codeStr = R.orderCode(order.id);
  if (Q.total === 0) { await finalize(order.id); return { order: order.id, code: codeStr, url: `/checkout/return?order=${codeStr}&t=${order.token}`, total: 0 }; }
  // Банк возвращает покупателя с личным токеном заказа: после оплаты в приложении банка
  // он часто попадает в другой браузер, где нет куки доступа к заказу.
  const pay = await createPayment(order, { code: codeStr, names, email, method: pm.id, returnUrl: `${SITE_URL}/checkout/return?order=${codeStr}&t=${order.token}` });
  await R.setPayment(order.id, pay.id, pay.url);
  return { order: order.id, code: codeStr, url: pay.url, back: `/checkout/return?order=${codeStr}&t=${order.token}`, total: Q.total, codeNote: Q.codeNote };
}

// Фоновая проверка оплат: если уведомление банка не пришло, а покупатель закрыл страницу,
// сервер сам спрашивает у банка статус платежа. Возвращает число заказов, оплата которых подтвердилась.
export async function checkPendingPayments({ recentOnly = true } = {}) {
  if (!activeProvider()) return 0;
  let paid = 0;
  for (const o of await R.ordersAwaitingPayment({ recentOnly })) {
    const p = await fetchPayment(o.payment_id).catch(() => null);
    if (p?.paid && p.orderId === o.id && Math.abs(p.amount - o.total) < 0.01 && (await finalize(o.id))) paid++;
  }
  return paid;
}

// Заказ ждёт оплаты или отменён — спрашиваем у банка, не пришли ли деньги. Возвращает актуальный заказ.
export async function refreshOrderPayment(o) {
  if (!o || !["pending", "canceled"].includes(o.status) || !o.payment_id || o.test || !activeProvider()) return o;
  const p = await fetchPayment(o.payment_id).catch(() => null);
  if (p?.paid && p.orderId === o.id && Math.abs(p.amount - o.total) < 0.01) { await finalize(o.id); return R.orderById(o.id); }
  return o;
}

// Доступ к скачиванию по оферте (п. 4.3) — 12 месяцев со дня покупки
export const accessUntil = paid => { const d = new Date(paid); d.setMonth(d.getMonth() + 12); return d; };

// Оплата подтверждена: открываем доступ и присылаем ссылку. Повторный вызов ничего не делает.
export async function finalize(orderId) {
  const o = await R.markPaid(orderId);
  if (!o) return false;
  const customer = await R.customerById(o.customer_id);
  const code = R.orderCode(o.id);
  const orderLink = `${SITE_URL}/o/${o.token}`;
  if (o.email) {
    const names = Object.fromEntries((await R.getModelsAll()).map(m => [m.id, m.name]));
    const lines = (o.lines?.length ? o.lines : o.items.map(id => ({ id, price: null })));
    await sendMail(o.email, `Заказ ${code}: файлы готовы`, {
      title: o.total ? `Заказ ${code} оплачен` : `Заказ ${code} оформлен`,
      intro: "Спасибо за покупку в lola.stl! Файлы уже ждут вас — скачать их можно по кнопке ниже.",
      items: lines.map(l => ({ name: names[l.id] || l.id, price: l.price })),
      total: o.total,
      button: { label: "Скачать файлы", url: orderLink },
      note: [
        `Это личная ссылка на заказ: по ней можно скачать файлы и открыть чек. Скачивание доступно 12 месяцев — до ${accessUntil(o.paid_at || Date.now()).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })}; сохраните файлы на своих устройствах. Не пересылайте ссылку. Все заказы собраны в личном кабинете: ${SITE_URL}/account`,
        "Отпечатки можно продавать, а сами файлы передавать и публиковать нельзя — так написано в лицензии.",
      ],
    });
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
  await sendMail(customer.email, "Вход в личный кабинет lola.stl", {
    title: "Вход в личный кабинет",
    intro: "В кабинете — все ваши заказы, файлы для скачивания и чеки.",
    button: { label: "Войти в кабинет", url: link },
    note: ["Ссылка действует 3 дня. После входа кабинет открыт на этом устройстве 90 дней. Если вы не запрашивали вход, просто удалите письмо."],
  });
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
      until: o.paid_at ? accessUntil(o.paid_at).getTime() : null,
      ...(withLog ? { consents: o.consents || null, log: mine.map(d => ({ id: d.model_id, at: new Date(d.at).getTime(), ua: d.ua, ip: d.ip, ch: o.channel })) } : {}),
    };
  });
}

// ---------- выдача файла ----------
// Доступ к файлам — по уникальной ссылке заказа (или из личного кабинета), без ограничения числа скачиваний.
// Каждое скачивание пишется в журнал заказа; закрыть доступ владелица может вручную в разделе «Заказы».
export async function issueDownload({ orderId, modelId, fileId, customerId, access, info }) {
  const o = await R.orderById(orderId);
  const mine = o && (o.customer_id === customerId || access.includes(o.id));
  if (!mine) return { status: 403, error: "Этот заказ открывается по личной ссылке из письма или в личном кабинете." };
  if (!["paid", "review"].includes(o.status)) return { status: 403, error: "Доступ к файлам этого заказа закрыт. Если это ошибка, напишите нам." };
  if (!o.items.includes(modelId)) return { status: 404, error: "В заказе нет такой модели." };
  const models = await R.getModelsForOrders();
  const m = models.find(x => x.id === modelId);
  const files = m ? modelFiles(m) : [];
  if (!files.length) return { status: 404, error: "Файл модели ещё не загружен. Мы уже знаем и скоро исправим." };
  const f = fileId ? files.find(x => x.id === fileId) : files[0];
  if (!f) return { status: 404, error: "Такого файла у модели нет." };
  await R.logDownload(o.id, modelId, info.ip, info.net, info.ua);
  const ext = (f.key.split(".").pop() || "stl").toLowerCase();
  // Имя файла у покупателя: модель_заказ[_часть].stl — по номеру заказа видно, откуда файл
  const part = files.length > 1 ? "_" + (String(f.name || "").replace(/\.[a-z0-9]+$/i, "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 40) || files.indexOf(f) + 1) : "";
  const name = `${m.slug}_${R.orderCode(o.id)}${part}.${ext}`;
  return { url: await downloadUrl(f.key, name), name };
}

// Все файлы заказа с именами, как у отдельного скачивания: модель_заказ[_часть].stl
export async function orderFiles(o) {
  const models = await R.getModelsForOrders();
  const code = R.orderCode(o.id), out = [], used = new Set();
  for (const id of o.items) {
    const m = models.find(x => x.id === id);
    const files = m ? modelFiles(m) : [];
    files.forEach((f, i) => {
      const ext = (f.key.split(".").pop() || "stl").toLowerCase();
      const part = files.length > 1 ? "_" + (String(f.name || "").replace(/\.[a-z0-9]+$/i, "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 40) || i + 1) : "";
      let name = `${m.slug}_${code}${part}.${ext}`;
      for (let n = 2; used.has(name); n++) name = `${m.slug}_${code}${part}_${n}.${ext}`;
      used.add(name);
      out.push({ modelId: id, key: f.key, name, mb: f.mb || 0 });
    });
  }
  return out;
}

// «Скачать всё»: те же проверки доступа, что у одного файла; в журнал — каждая модель заказа.
// Ссылка на архив живёт 5 минут, архив собирается потоком без копии на диске (/api/zip/<токен>).
export async function issueZip({ orderId, customerId, access, info }) {
  const o = await R.orderById(orderId);
  const mine = o && (o.customer_id === customerId || access.includes(o.id));
  if (!mine) return { status: 403, error: "Этот заказ открывается по личной ссылке из письма или в личном кабинете." };
  if (!["paid", "review"].includes(o.status)) return { status: 403, error: "Доступ к файлам этого заказа закрыт. Если это ошибка, напишите нам." };
  const files = await orderFiles(o);
  if (!files.length) return { status: 404, error: "Файлы моделей ещё не загружены. Мы уже знаем и скоро исправим." };
  for (const id of new Set(files.map(f => f.modelId))) await R.logDownload(o.id, id, info.ip, info.net, info.ua);
  return { url: "/api/zip/" + encodeURIComponent(sign({ zip: o.id, exp: Date.now() + 5 * 60 * 1000 })), files: files.length, mb: Math.round(files.reduce((a, f) => a + f.mb, 0)) };
}

// Повторно отправить покупателю ссылку на заказ (письмом и в Telegram)
export async function resendOrderLink(o) {
  const code = R.orderCode(o.id), link = `${SITE_URL}/o/${o.token}`;
  if (o.email) await sendMail(o.email, `Заказ ${code}: ссылка на файлы`, {
    title: `Ваш заказ ${code}`,
    intro: "Присылаем ссылку на ваш заказ ещё раз. По ней всегда можно скачать файлы и открыть чек.",
    button: { label: "Открыть заказ", url: link },
    note: [`Все заказы — в личном кабинете: ${SITE_URL}/account`],
  });
  const c = await R.customerById(o.customer_id);
  const tg = o.tg_id || c?.tg_id;
  if (tg) await sendTelegram(tg, `Ваш заказ ${code}: файлы и чек — по кнопке ниже.`, { reply_markup: { inline_keyboard: [[{ text: "Открыть заказ", web_app: { url: link } }]] } });
}

export const isPromoOn = promoOn;

// ---------- возврат ----------
// Полный возврат денег через провайдера, после чего доступ к файлам закрывается.
// По оферте деньги возвращаются, если файл повреждён и заменить его нельзя.
export async function refundOrder(o) {
  if (!["paid", "review", "revoked"].includes(o.status)) return { error: "Вернуть можно только оплаченный заказ." };
  if (!o.total) return { error: "Заказ бесплатный — возвращать нечего." };
  const models = await R.getModelsAll();
  const names = Object.fromEntries(models.map(m => [m.id, m.name]));
  try { await refundPayment(o, { names }); }
  catch (e) { return { error: "Возврат не прошёл: " + e.message }; }
  await R.setStatus(o.id, "refunded");
  const code = R.orderCode(o.id);
  if (o.email) await sendMail(o.email, `Заказ ${code}: возврат денег`, {
    title: `Возврат по заказу ${code}`,
    intro: `Мы оформили возврат ${o.total} ₽ за заказ ${code}.`,
    paragraphs: ["По СБП деньги приходят почти сразу, на карту — обычно за 3–7 дней, в редких случаях до 30 дней.", "Доступ к файлам этого заказа закрыт."],
    note: [`Остались вопросы — напишите нам: ${SITE_URL}/contacts`],
  });
  return { ok: true };
}

// ---------- чек ----------
// Данные кассового чека из ЮKassa (фискальный номер и т. п.). ЮKassa регистрирует чек через несколько
// секунд после оплаты, поэтому берём его при первом открытии чека и сохраняем в заказе.
export async function receiptFor(o) {
  if (o.receipt || o.test || !o.payment_id || !o.paid_at) return o.receipt || null;
  const r = await fetchReceipt(o.payment_id).catch(() => null);
  if (r) await R.setReceipt(o.id, r);
  return r;
}
