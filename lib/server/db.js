// База данных магазина.
// DATABASE_URL задан — подключаемся к Postgres (Neon, Supabase, Yandex Managed PostgreSQL).
// Не задан — встроенный Postgres (PGlite) в папке .data/: для разработки и проверки без настроек.
// Схема создаётся при первом подключении, пустая база наполняется текущим каталогом.

import { BASE_CATEGORIES, BASE_MODELS } from "../models.js";
import { DEFAULT_PRICES } from "../pricing.js";

const SCHEMA = `
create table if not exists categories (
  id text primary key, slug text not null, name text not null, single text, gen text,
  pricing text not null default 'plant', descr text, in_menu boolean not null default true,
  sort int not null default 0, custom boolean not null default false, deleted boolean not null default false
);
create table if not exists models (
  id text primary key, slug text not null, data jsonb not null,
  deleted boolean not null default false, updated_at timestamptz not null default now()
);
create table if not exists settings (key text primary key, value jsonb not null);
create table if not exists promo_codes (id text primary key, code text not null, data jsonb not null, deleted boolean not null default false);
create table if not exists bundles (id text primary key, data jsonb not null, deleted boolean not null default false);
create table if not exists customers (
  id serial primary key, email text unique, tg_id text unique, tg_name text, created_at timestamptz not null default now()
);
create table if not exists orders (
  id serial primary key, customer_id int references customers(id), email text, tg_id text, channel text not null default 'site',
  status text not null default 'pending', total int not null, items jsonb not null, lines jsonb not null,
  sets jsonb not null default '[]', discount jsonb, code text, method text,
  payment_id text, payment_url text, reset_at timestamptz, created_at timestamptz not null default now(), paid_at timestamptz
);
create index if not exists orders_customer on orders(customer_id);
create index if not exists orders_payment on orders(payment_id);
create table if not exists downloads (
  id serial primary key, order_id int not null references orders(id), model_id text not null,
  ip text, net text, ua text, at timestamptz not null default now()
);
create index if not exists downloads_order on downloads(order_id);
create table if not exists login_tokens (
  nonce text primary key, customer_id int not null references customers(id), expires_at timestamptz not null, used_at timestamptz
);
create table if not exists outbox (
  id serial primary key, channel text not null, recipient text not null, subject text, body text not null,
  sent boolean not null default false, error text, at timestamptz not null default now()
);
`;

const g = globalThis;

async function connect() {
  if (process.env.DATABASE_URL) {
    const postgres = (await import("postgres")).default;
    const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 5, idle_timeout: 20, onnotice: () => {} });
    return { kind: "postgres", query: async (text, params = []) => sql.unsafe(text, params), exec: async text => sql.unsafe(text) };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { mkdirSync } = await import("node:fs");
  // На Vercel без DATABASE_URL писать можно только во временную папку: сайт работает, но заказы
  // пропадают при перезапуске. Для настоящих продаж обязательно задайте DATABASE_URL.
  const dir = process.env.PGLITE_DIR || (process.env.VERCEL ? "/tmp/lola-pglite" : ".data/pglite");
  if (process.env.VERCEL) console.warn("DATABASE_URL не задан: используется временная база, заказы не сохранятся");
  mkdirSync(dir, { recursive: true });
  const pg = new PGlite(dir);
  await pg.waitReady;
  return { kind: "pglite", query: async (text, params = []) => (await pg.query(text, params)).rows, exec: async text => pg.exec(text) };
}

async function seed(db) {
  const [{ n }] = await db.query("select count(*)::int as n from categories");
  if (n > 0) return;
  for (const [i, c] of BASE_CATEGORIES.entries()) {
    await db.query("insert into categories (id, slug, name, single, gen, pricing, descr, in_menu, sort) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [c.id, c.slug, c.name, c.single, c.gen, c.pricing, c.desc, c.inMenu, c.order ?? i + 1]);
  }
  for (const m of BASE_MODELS) {
    await db.query("insert into models (id, slug, data) values ($1,$2,$3::jsonb)", [m.id, m.slug, JSON.stringify({ ...m, fileKey: `models/${m.id}.stl` })]);
  }
  const settings = {
    prices: DEFAULT_PRICES,
    promo: { on: false, auto: false, start: "2026-11-20", end: "2026-11-30" },
    loyalty: { on: true, percent: 10 },
    downloads: { limit: 5, nets: 3 },
  };
  for (const [k, v] of Object.entries(settings)) await db.query("insert into settings (key, value) values ($1, $2::jsonb)", [k, JSON.stringify(v)]);
  await db.query("insert into promo_codes (id, code, data) values ($1,$2,$3::jsonb)", ["pc-lola10", "LOLA10", JSON.stringify({
    id: "pc-lola10", code: "LOLA10", type: "percent", value: 10, active: true, from: "", to: "", maxUses: 0, once: true, minTotal: 0,
    category: "", firstOnly: true, duringPromo: false, note: "Для подписчиков канала, первый заказ" })]);
  await db.query("insert into bundles (id, data) values ($1,$2::jsonb)", ["kashpo-all", JSON.stringify({
    id: "kashpo-all", name: "Все кашпо", desc: "Пять кашпо из каталога одним набором.", items: ["p01", "p02", "p03", "p04", "p05"], price: 1800, active: true })]);
}

export async function db() {
  if (!g.__lolaDb) {
    g.__lolaDb = (async () => {
      const c = await connect();
      await c.exec(SCHEMA);
      await seed(c);
      return c;
    })().catch(e => { g.__lolaDb = null; throw e; });
  }
  return g.__lolaDb;
}

export async function q(text, params) {
  return (await db()).query(text, params);
}
export async function one(text, params) {
  return (await q(text, params))[0] || null;
}
