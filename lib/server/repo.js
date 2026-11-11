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
const catRow = r => ({ id: r.id, slug: r.slug, name: r.name, single: r.single, gen: r.gen, pricing: r.pricing, desc: r.descr || "", inMenu: r.in_menu, order: r.sort, custom: r.custom });

export async function getCategories() {
  return cached("cats", async () => (await q("select * from categories where not deleted order by sort, name")).map(catRow));
}
export async function getModelsAll() {
  return cached("models", async () => (await q("select data from models where not deleted order by (data->>'order')::int nulls last, id")).map(r => r.data));
}
export async function getPublicModels() {
  return (await getModelsAll()).filter(m => !m.hidden);
}

export async function saveCategories(list) {
  invalidate();
  const ids = list.map(c => c.id);
  for (const c of list) {
    await q(`insert into categories (id, slug, name, single, gen, pricing, descr, in_menu, sort, custom, deleted) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      on conflict (id) do update set slug=$2, name=$3, single=$4, gen=$5, pricing=$6, descr=$7, in_menu=$8, sort=$9, custom=$10, deleted=$11`,
      [c.id, c.slug, c.name, c.single || c.name, c.gen || "", c.pricing === "box" ? "box" : "plant", c.desc || "", !!c.inMenu, c.order || 0, !!c.custom, !!c.deleted]);
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
  const r = await one("select count(*)::int as n from orders where upper(code) = upper($1) and status <> 'pending' and status <> 'canceled'", [code]);
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
  return one(`insert into orders (customer_id, email, tg_id, channel, status, total, items, lines, sets, discount, code, method)
    values ($1,$2,$3,$4,'pending',$5,$6::text::jsonb,$7::text::jsonb,$8::text::jsonb,$9::text::jsonb,$10,$11) returning *`,
    [o.customerId, o.email, o.tgId || null, o.channel, o.total, j(o.items), j(o.lines), j(o.sets || []), j(o.discount), o.code || null, o.method || null]);
}
export const orderById = id => one("select * from orders where id = $1", [id]);
export const orderByPayment = pid => one("select * from orders where payment_id = $1", [pid]);
export async function setPayment(id, paymentId, url) {
  return one("update orders set payment_id = $2, payment_url = $3 where id = $1 returning *", [id, paymentId, url]);
}
// Оплата подтверждена. Идемпотентно: второй вызов вернёт null и ничего не отправит повторно.
export async function markPaid(id) {
  return one("update orders set status = 'paid', paid_at = now() where id = $1 and status = 'pending' returning *", [id]);
}
export async function setStatus(id, status) {
  return one("update orders set status = $2 where id = $1 returning *", [id, status]);
}
export async function resetDownloads(id) {
  return one("update orders set reset_at = now() where id = $1 returning *", [id]);
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
  const r = await one("select count(*)::int as n from orders where customer_id = $1 and status in ('paid','review','revoked')", [customerId]);
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
export async function netsLastDay(orderId) {
  const r = await one("select count(distinct net)::int as n from downloads where order_id = $1 and at > now() - interval '1 day'", [orderId]);
  return r?.n || 0;
}

// ---------- вход по ссылке из письма ----------
export async function createLoginToken(customerId, nonce, ttlHours = 72) {
  await q("insert into login_tokens (nonce, customer_id, expires_at) values ($1,$2, now() + ($3 || ' hours')::interval)", [nonce, customerId, String(ttlHours)]);
}
export async function useLoginToken(nonce) {
  return one("update login_tokens set used_at = now() where nonce = $1 and used_at is null and expires_at > now() returning customer_id", [nonce]);
}

// ---------- журнал писем и сообщений ----------
export async function outboxAdd(channel, recipient, subject, body, sent, error) {
  await q("insert into outbox (channel, recipient, subject, body, sent, error) values ($1,$2,$3,$4,$5,$6)", [channel, recipient, subject || null, body, !!sent, error || null]);
}
export async function outboxList(limit = 50) {
  return q("select * from outbox order by at desc limit $1", [limit]);
}
