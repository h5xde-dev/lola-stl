// Аналитика заказов для админки. Данных немного (сотни–тысячи заказов), поэтому считаем в памяти:
// одна выборка заказов за период и предыдущий период такой же длины для сравнения.
import * as R from "./repo.js";

const PAID = new Set(["paid", "review", "revoked"]);
const DAY = 864e5;
const mskKey = d => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));

// Ключ интервала графика: день, неделя (с понедельника) или месяц
function bucketOf(d, unit) {
  const k = mskKey(d);
  if (unit === "month") return k.slice(0, 7);
  if (unit === "week") {
    const x = new Date(k + "T12:00:00Z"), wd = (x.getUTCDay() + 6) % 7;
    return mskKey(x.getTime() - wd * DAY);
  }
  return k;
}
function buckets(from, to, unit) {
  const out = [], seen = new Set();
  for (let t = from; t <= to; t += DAY) { const k = bucketOf(t, unit); if (!seen.has(k)) { seen.add(k); out.push(k); } }
  const last = bucketOf(to, unit); if (!seen.has(last)) out.push(last);
  return out;
}

function summarize(orders, firstPaid) {
  const paid = orders.filter(o => o.paid_at && PAID.has(o.status));
  const revenue = paid.reduce((a, o) => a + o.total, 0);
  const items = paid.reduce((a, o) => a + (o.items?.length || 0), 0);
  const discounts = paid.reduce((a, o) => a + (o.discount?.amount || 0), 0);
  const created = orders.length;
  const customers = new Set(paid.map(o => o.customer_id));
  const newCustomers = [...customers].filter(c => {
    const f = firstPaid.get(c);
    return f && paid.some(o => o.customer_id === c && +new Date(o.paid_at) === f);
  }).length;
  return {
    revenue, orders: paid.length, avg: paid.length ? Math.round(revenue / paid.length) : 0, items, discounts,
    created, conversion: created ? paid.length / created : 0, customers: customers.size, newCustomers, returning: customers.size - newCustomers,
  };
}

export async function analytics(days) {
  const now = Date.now();
  const all = !days;
  const firstRows = await R.firstPaidByCustomer();
  const firstPaid = new Map(firstRows.map(r => [r.customer_id, +new Date(r.first)]));
  let from = all ? null : now - days * DAY;
  const raw = await R.ordersSince(new Date(all ? 0 : from - days * DAY));
  // Тестовые заказы (оплата без денег) в аналитику не входят
  const rows = raw.filter(o => !o.test);
  const testCount = raw.filter(o => o.test && +new Date(o.created_at) >= (from ?? 0)).length;
  if (all) from = rows.length ? +new Date(rows[0].created_at) : now - 30 * DAY;
  const span = now - from;
  const cur = rows.filter(o => +new Date(o.created_at) >= from);
  const prev = all ? [] : rows.filter(o => +new Date(o.created_at) < from);
  const paid = cur.filter(o => o.paid_at && PAID.has(o.status));

  // График выручки и заказов
  const unit = span <= 92 * DAY ? "day" : span <= 400 * DAY ? "week" : "month";
  const keys = buckets(from, now, unit);
  const series = Object.fromEntries(keys.map(k => [k, { key: k, revenue: 0, orders: 0 }]));
  for (const o of paid) { const k = bucketOf(o.paid_at, unit); if (series[k]) { series[k].revenue += o.total; series[k].orders++; } }

  // Модели: штуки и выручка по позициям чека (цена заказа уже разложена по позициям)
  const [models, cats] = await Promise.all([R.getModelsAll(), R.getCategories()]);
  const byId = Object.fromEntries(models.map(m => [m.id, m]));
  const top = {}, byCat = {};
  for (const o of paid) for (const l of o.lines || []) {
    const m = byId[l.id];
    const t = top[l.id] || (top[l.id] = { id: l.id, name: m?.name || l.id, slug: m?.slug, count: 0, revenue: 0, gifts: 0 });
    t.count++; t.revenue += l.price || 0; if (l.gift) t.gifts++;
    const c = cats.find(x => x.id === m?.category)?.name || "Без категории";
    const b = byCat[c] || (byCat[c] = { name: c, count: 0, revenue: 0 });
    b.count++; b.revenue += l.price || 0;
  }
  const group = (list, key) => {
    const g = {};
    for (const o of list) { const k = key(o) || "—"; const x = g[k] || (g[k] = { name: k, orders: 0, revenue: 0 }); x.orders++; x.revenue += o.total; }
    return Object.values(g).sort((a, b) => b.revenue - a.revenue);
  };
  const codes = {};
  for (const o of paid) if (o.discount?.amount) {
    const k = o.discount.kind === "code" ? o.discount.code : o.discount.kind === "loyalty" ? "Скидка постоянным" : (o.discount.label || "Скидка");
    const x = codes[k] || (codes[k] = { name: k, orders: 0, discount: 0, revenue: 0 });
    x.orders++; x.discount += o.discount.amount; x.revenue += o.total;
  }
  const dls = await R.downloadsSince(new Date(from));

  return {
    period: { from: new Date(from).toISOString(), to: new Date(now).toISOString(), days: all ? 0 : days, unit },
    kpi: summarize(cur, firstPaid), prev: all ? null : summarize(prev, firstPaid),
    series: keys.map(k => series[k]),
    top: Object.values(top).sort((a, b) => b.count - a.count || b.revenue - a.revenue).slice(0, 10),
    categories: Object.values(byCat).sort((a, b) => b.revenue - a.revenue),
    channels: group(paid, o => (o.channel === "tg" ? "Telegram" : "Сайт")),
    methods: group(paid, o => o.method || "Не указан"),
    discounts: Object.values(codes).sort((a, b) => b.orders - a.orders),
    statuses: { pending: cur.filter(o => o.status === "pending").length, canceled: cur.filter(o => o.status === "canceled").length,
      revoked: cur.filter(o => o.status === "revoked").length },
    downloads: dls.length, testOrders: testCount,
  };
}
