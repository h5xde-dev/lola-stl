// Запросы к базе. Здесь же — приведение строк к виду, с которым работают страницы и расчёт цены.
import { q, one } from "./db.js";

const j = v => JSON.stringify(v ?? null);

// ---------- кеш каталога ----------
// Каталог, настройки, промокоды и наборы меняются только из админки, а читаются на каждой странице.
// Держим их в памяти до 30 секунд; любое сохранение из админки сбрасывает кеш сразу.
const g = globalThis;
const cache = g.__lolaCache || (g.__lolaCache = new Map());
async function cached(key, load, ttl = 30000) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value;
  const value = await load();
  cache.set(key, { value, at: Date.now() });
  return value;
}
export const invalidate = () => cache.clear();

// ---------- каталог ----------
const catRow = r => ({ id: r.id, slug: r.slug, name: r.name, single: r.single, gen: r.gen, pricing: r.pricing, desc: r.descr || "", inMenu: r.in_menu, order: r.sort, custom: r.custom, gifts: r.gifts !== false,
  seoTitle: r.seo?.title || "", seoDesc: r.seo?.desc || "" });

export async function getCategories() {
  return cached("cats", async () => (await q("select * from categories where not deleted order by sort, name")).map(catRow));
}
export async function getModelsAll() {
  return cached("models", async () => (await q("select data from models where not deleted order by (data->>'order')::int nulls last, id")).map(r => r.data));
}
// Вместе с удалёнными: купленную модель покупатель скачивает и после её удаления из каталога
export async function getModelsForOrders() {
  return (await q("select data from models")).map(r => r.data);
}
export async function getPublicModels() {
  return (await getModelsAll()).filter(m => !m.hidden);
}

export async function saveCategories(list) {
  invalidate();
  const ids = list.map(c => c.id);
  for (const c of list) {
    await q(`insert into categories (id, slug, name, single, gen, pricing, descr, in_menu, sort, custom, deleted, seo, gifts) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::text::jsonb,$13)
      on conflict (id) do update set slug=$2, name=$3, single=$4, gen=$5, pricing=$6, descr=$7, in_menu=$8, sort=$9, custom=$10, deleted=$11, seo=$12::text::jsonb, gifts=$13`,
      [c.id, c.slug, c.name, c.single || c.name, c.gen || "", c.pricing === "box" ? "box" : "plant", c.desc || "", !!c.inMenu, c.order || 0, !!c.custom, !!c.deleted,
        j({ title: c.seoTitle || "", desc: c.seoDesc || "" }), c.gifts !== false]);
  }
  if (ids.length) await q("update categories set deleted = true where not (id = any($1::text[]))", [ids]);
}

export async function saveModels(list) {
  invalidate();
  const ids = list.map(m => m.id);
  for (const m of list) {
    const data = { ...m };
    delete data.file; // имя исходного файла из браузера не храним
    await q(`insert into models (id, slug, data, deleted, updated_at) values ($1,$2,$3::text::jsonb,$4, now())
      on conflict (id) do update set slug=$2, data=$3::text::jsonb, deleted=$4, updated_at = case when models.data is distinct from $3::text::jsonb then now() else models.updated_at end`,
      [m.id, m.slug, j(data), !!m.deleted]);
  }
  if (ids.length) await q("update models set deleted = true where not (id = any($1::text[]))", [ids]);
}

// ---------- настройки ----------
export async function getSettings() {
  return cached("settings", async () => Object.fromEntries((await q("select key, value from settings")).map(r => [r.key, r.value])));
}
export async function setSettings(patch) {
  invalidate();
  for (const [k, v] of Object.entries(patch)) {
    await q("insert into settings (key, value) values ($1, $2::text::jsonb) on conflict (key) do update set value = $2::text::jsonb", [k, j(v)]);
  }
}

// ---------- статьи ----------
export async function getArticles() {
  return cached("articles", async () => (await q("select data, updated_at from articles where not deleted")).map(r => ({ ...r.data, updated: new Date(r.updated_at).toISOString() })));
}
export async function saveArticles(list) {
  invalidate();
  const ids = list.map(a => a.id);
  for (const a of list) {
    const data = { ...a }; delete data.updated;
    await q(`insert into articles (id, slug, data, deleted) values ($1,$2,$3::text::jsonb,$4)
      on conflict (id) do update set slug=$2, data=$3::text::jsonb, deleted=$4,
        updated_at = case when articles.data is distinct from $3::text::jsonb then now() else articles.updated_at end`, [a.id, a.slug, j(data), !!a.deleted]);
  }
  if (ids.length) await q("update articles set deleted = true where not (id = any($1::text[]))", [ids]);
  else await q("update articles set deleted = true");
}

// ---------- промокоды и наборы ----------
export async function getPromoCodes() {
  return cached("codes", async () => (await q("select data from promo_codes where not deleted order by code")).map(r => r.data));
}
export async function savePromoCodes(list) {
  invalidate();
  const ids = list.map(c => c.id);
  for (const c of list) {
    await q(`insert into promo_codes (id, code, data, deleted) values ($1,$2,$3::text::jsonb,$4)
      on conflict (id) do update set code=$2, data=$3::text::jsonb, deleted=$4`, [c.id, String(c.code).toUpperCase(), j(c), !!c.deleted]);
  }
  if (ids.length) await q("update promo_codes set deleted = true where not (id = any($1::text[]))", [ids]);
}
export async function getBundles() {
  return cached("bundles", async () => (await q("select data from bundles where not deleted order by id")).map(r => r.data));
}
export async function saveBundles(list) {
  invalidate();
  const ids = list.map(b => b.id);
  for (const b of list) {
    await q(`insert into bundles (id, data, deleted) values ($1,$2::text::jsonb,$3)
      on conflict (id) do update set data=$2::text::jsonb, deleted=$3`, [b.id, j(b), !!b.deleted]);
  }
  if (ids.length) await q("update bundles set deleted = true where not (id = any($1::text[]))", [ids]);
}
// Сколько оплаченных заказов уже использовали код (для общего лимита)
export async function codeUses(code) {
  const r = await one("select count(*)::int as n from orders where upper(code) = upper($1) and status <> 'pending' and status <> 'canceled' and not test", [code]);
  return r?.n || 0;
}

// ---------- покупатели ----------
export async function customerByEmail(email, create = false) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;
  const found = await one("select * from customers where email = $1", [e]);
  if (found || !create) return found;
  return one("insert into customers (email) values ($1) on conflict (email) do update set email = excluded.email returning *", [e]);
}
export async function customerByTg(tgId, name) {
  const id = String(tgId);
  const found = await one("select * from customers where tg_id = $1", [id]);
  if (found) return found;
  return one("insert into customers (tg_id, tg_name) values ($1, $2) on conflict (tg_id) do update set tg_name = excluded.tg_name returning *", [id, name || null]);
}
export async function customerById(id) {
  return id ? one("select * from customers where id = $1", [id]) : null;
}
// Telegram-аккаунт указал email: если такой покупатель уже есть, его заказы переходят к Telegram-аккаунту.
export async function linkEmail(customer, email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e || customer.email === e) return customer;
  const other = await customerByEmail(e);
  if (other && other.id !== customer.id) {
    await q("update orders set customer_id = $1 where customer_id = $2", [customer.id, other.id]);
    await q("update login_tokens set customer_id = $1 where customer_id = $2", [customer.id, other.id]);
    await q("delete from customers where id = $1", [other.id]);
  }
  return one("update customers set email = $2 where id = $1 returning *", [customer.id, e]);
}

// ---------- заказы ----------
export const orderCode = id => "L-" + (1000 + Number(id));
export const orderIdFromCode = code => { const n = Number(String(code).replace(/^L-/, "")) - 1000; return n > 0 ? n : 0; };

export async function createOrder(o) {
  const { randomBytes } = await import("node:crypto");
  return one(`insert into orders (customer_id, email, tg_id, channel, status, total, items, lines, sets, discount, code, method, token, test, consents)
    values ($1,$2,$3,$4,'pending',$5,$6::text::jsonb,$7::text::jsonb,$8::text::jsonb,$9::text::jsonb,$10,$11,$12,$13,$14::text::jsonb) returning *`,
    [o.customerId, o.email, o.tgId || null, o.channel, o.total, j(o.items), j(o.lines), j(o.sets || []), j(o.discount), o.code || null, o.method || null,
      randomBytes(18).toString("base64url"), !!o.test, j(o.consents || null)]);
}
export const orderById = id => one("select * from orders where id = $1", [id]);
export const orderByToken = t => (t && /^[A-Za-z0-9_-]{16,64}$/.test(t) ? one("select * from orders where token = $1", [t]) : null);
export const setReceipt = (id, receipt) => one("update orders set receipt = $2::text::jsonb where id = $1 returning *", [id, j(receipt)]);
// Заказы для аналитики: созданные с даты from (оплаченные и неоплаченные)
export const ordersSince = from => q("select id, customer_id, channel, status, total, items, lines, discount, code, method, test, created_at, paid_at from orders where created_at >= $1 order by created_at", [from]);
export const firstPaidByCustomer = () => q("select customer_id, min(paid_at) as first from orders where paid_at is not null and not test group by customer_id");
// Удалить тестовые заказы вместе с журналом их скачиваний
export async function deleteTestOrders() {
  await q("delete from downloads where order_id in (select id from orders where test)");
  const r = await one("with d as (delete from orders where test returning 1) select count(*)::int as n from d");
  return r?.n || 0;
}
export const downloadsSince = from => q("select order_id, model_id, at from downloads where at >= $1", [from]);
export const orderByPayment = pid => one("select * from orders where payment_id = $1", [pid]);
export async function setPayment(id, paymentId, url) {
  return one("update orders set payment_id = $2, payment_url = $3 where id = $1 returning *", [id, paymentId, url]);
}
// Оплата подтверждена. Идемпотентно: второй вызов вернёт null и ничего не отправит повторно.
// Отменённый по таймеру заказ тоже открывается: ссылка Точки живёт 7 дней, и покупатель мог оплатить позже.
export async function markPaid(id) {
  return one("update orders set status = 'paid', paid_at = now() where id = $1 and status in ('pending', 'canceled') returning *", [id]);
}
export async function setStatus(id, status) {
  return one("update orders set status = $2 where id = $1 returning *", [id, status]);
}
// Заказы, оплату которых стоит перепроверить у банка: ждущие оплаты и отменённые по таймеру
// (ссылка Точки живёт 7 дней). recentOnly — только созданные за последние 2 часа.
export async function ordersAwaitingPayment({ recentOnly = true } = {}) {
  return q(`select * from orders where status in ('pending', 'canceled') and not test and payment_id is not null
    and payment_id not like 'mock_%' and created_at > now() - interval '${recentOnly ? "2 hours" : "7 days"}' order by created_at desc limit 100`);
}
export async function cancelStale() {
  await q("update orders set status = 'canceled' where status = 'pending' and created_at < now() - interval '1 hour'");
}
export async function ordersForCustomer(customerId, extraIds = []) {
  return q(`select * from orders where (customer_id = $1 or id = any($2::int[])) and status not in ('pending', 'canceled') order by created_at desc`,
    [customerId || 0, extraIds.length ? extraIds : [0]]);
}
export async function allOrders(limit = 300) {
  return q("select o.*, c.tg_name from orders o left join customers c on c.id = o.customer_id where o.status <> 'canceled' order by o.created_at desc limit $1", [limit]);
}
export async function paidOrdersCount(customerId) {
  if (!customerId) return 0;
  const r = await one("select count(*)::int as n from orders where customer_id = $1 and status in ('paid','review','revoked') and not test", [customerId]);
  return r?.n || 0;
}

// ---------- скачивания ----------
export async function logDownload(orderId, modelId, ip, net, ua) {
  await q("insert into downloads (order_id, model_id, ip, net, ua) values ($1,$2,$3,$4,$5)", [orderId, modelId, ip, net, ua]);
}
export async function downloadsFor(orderIds) {
  if (!orderIds.length) return [];
  return q("select order_id, model_id, ip, net, ua, at from downloads where order_id = any($1::int[]) order by at", [orderIds]);
}

// ---------- вход по ссылке из письма ----------
export async function createLoginToken(customerId, nonce, ttlHours = 72) {
  await q("insert into login_tokens (nonce, customer_id, expires_at) values ($1,$2, now() + ($3 || ' hours')::interval)", [nonce, customerId, String(ttlHours)]);
}
export async function useLoginToken(nonce) {
  return one("update login_tokens set used_at = now() where nonce = $1 and used_at is null and expires_at > now() returning customer_id", [nonce]);
}

// ---------- журнал писем и сообщений ----------
// Журнал писем и сообщений. Ошибка записи не должна ломать отправку: письмо или ответ бота уже ушли,
// и если бросить ошибку, вызывающий (например, вебхук бота) ответит 500 и Telegram пришлёт обновление снова.
export async function outboxAdd(channel, recipient, subject, body, sent, error) {
  try {
    await q("insert into outbox (channel, recipient, subject, body, sent, error) values ($1,$2,$3,$4,$5,$6)", [channel, recipient, subject || null, body, !!sent, error || null]);
  } catch (e) { console.error("outbox:", e.message); }
}
// Неотправленное, с которым ещё есть что делать. Не показываем:
// - письмо или сообщение, после которого тому же адресату ушло такое же (повторная отправка);
// - письмо о заказе, если по этому заказу позже ушло любое письмо или сообщение;
// - всё о тестовых заказах; приветствия бота (их не повторяют); ссылки для входа старше 3 дней — они уже недействительны;
// - тестовые письма из админки.
const ORDER = "substring(coalesce(%s.subject, %s.body) from 'Заказ (L-[0-9]+)')";
const ob = ORDER.replaceAll("%s", "b"), og = ORDER.replaceAll("%s", "g");
const PENDING = `not b.sent
  and not exists (select 1 from outbox g where g.sent and g.channel = b.channel and g.recipient = b.recipient and g.at > b.at
    and coalesce(split_part(g.subject, ':', 1), '') = coalesce(split_part(b.subject, ':', 1), ''))
  and not (${ob} is not null and exists (select 1 from outbox g where g.sent and g.at >= b.at - interval '1 minute' and ${og} = ${ob}))
  and not exists (select 1 from orders o where o.test and 'L-' || (o.id + 1000) = ${ob})
  and not (b.channel = 'telegram' and b.body like 'Привет!%')
  and not (coalesce(b.subject, '') like 'Вход в личный кабинет%' and b.at < now() - interval '3 days')
  and coalesce(b.subject, '') not like 'Проверка%'`;
export async function outboxList(limit = 50, failedOnly = false) {
  return q(`select * from outbox b ${failedOnly ? "where " + PENDING : ""} order by at desc limit $1`, [limit]);
}
// Сводка для админки: сколько писем и сообщений ушло за сутки и неделю и сколько так и не доставлено
// (см. PENDING). via — ушло запасным путём (через SMTP).
export async function outboxStats() {
  const rows = await q(`select channel,
      count(*) filter (where at > now() - interval '24 hours' and sent)::int d_ok,
      count(*) filter (where at > now() - interval '24 hours' and sent and error like 'ушло через SMTP%')::int d_via,
      count(*) filter (where at > now() - interval '24 hours' and ${PENDING})::int d_fail,
      count(*) filter (where at > now() - interval '7 days' and sent)::int w_ok,
      count(*) filter (where at > now() - interval '7 days' and sent and error like 'ушло через SMTP%')::int w_via,
      count(*) filter (where at > now() - interval '7 days' and ${PENDING})::int w_fail,
      count(*) filter (where ${PENDING})::int t_fail
    from outbox b group by channel`);
  return Object.fromEntries(rows.map(r => [r.channel, {
    day: { ok: r.d_ok, fail: r.d_fail, via: r.d_via },
    week: { ok: r.w_ok, fail: r.w_fail, via: r.w_via },
    total: { fail: r.t_fail },
  }]));
}

// Сроки хранения по Политике обработки персональных данных (ред. 23.11.2026):
// - неоплаченный заказ без скачиваний — не более 30 дней с даты создания (п. 3.2);
// - технические журналы — не более 30 дней: IP, сеть и браузер в журнале скачиваний, журнал писем (п. 3.5);
// - ссылки для входа — после использования или истечения (п. 3.5);
// - покупатель без заказов и без Telegram, созданный при неоплаченном заказе, — вместе с заказом.
// Возвращает число удалённых или обезличенных записей по каждому виду.
export async function purgeExpired() {
  const n = async (sql) => (await q(sql)).length;
  const orders = await n(`delete from orders o where o.status in ('pending','canceled') and o.created_at < now() - interval '30 days'
    and not exists (select 1 from downloads d where d.order_id = o.id) returning o.id`);
  const downloads = await n(`update downloads set ip = null, net = null, ua = null
    where at < now() - interval '30 days' and (ip is not null or net is not null or ua is not null) returning id`);
  const mail = await n(`delete from outbox where at < now() - interval '30 days' returning id`);
  const tokens = await n(`delete from login_tokens where expires_at < now() or used_at is not null returning nonce`);
  const customers = await n(`delete from customers c where c.tg_id is null and c.created_at < now() - interval '30 days'
    and not exists (select 1 from orders o where o.customer_id = c.id)
    and not exists (select 1 from login_tokens t where t.customer_id = c.id) returning c.id`);
  return { orders, downloads, mail, tokens, customers };
}

// Покупатели для админки: контакты, оплаченные заказы, сумма и последняя покупка.
// Показываем тех, у кого есть заказ (кроме отменённых) или вход через Telegram.
export async function customersList(limit = 1000) {
  return q(`select c.id, c.email, c.tg_id, c.tg_name, c.created_at,
      count(o.id) filter (where o.status in ('paid','review') and not o.test)::int paid,
      coalesce(sum(o.total) filter (where o.status in ('paid','review') and not o.test), 0)::int spent,
      max(o.paid_at) last_paid,
      coalesce(array_agg('L-' || (o.id + 1000) order by o.id desc) filter (where o.status in ('paid','review')), '{}') codes,
      count(o.id) filter (where o.status = 'pending')::int pending
    from customers c left join orders o on o.customer_id = c.id and o.status <> 'canceled'
    group by c.id
    having count(o.id) > 0 or c.tg_id is not null
    order by max(coalesce(o.paid_at, o.created_at)) desc nulls last, c.id desc
    limit $1`, [limit]);
}
