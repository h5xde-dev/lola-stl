// Расчёт цены. Все функции чистые: на вход состояние магазина, на выход сумма и разбивка.
// Одна и та же функция работает в браузере (корзина) и будет работать на сервере (оплата),
// поэтому клиентской сумме сервер не доверяет — он пересчитывает её сам.
//
// Порядок применения скидок:
//   1. Наборы — фиксированная цена за коллекцию; их модели не участвуют в «2+1» / «1+1».
//   2. Подарки — «2+1» или во время акции «1+1» для категорий «как кашпо»; боксы по своим ценам.
//   3. Одна скидка на заказ — большая из двух: промокод или скидка постоянного покупателя.
//      Не суммируются и не действуют на наборы.
// 3, 5, 7 оплачиваемых моделей — предварительные цены, ждут согласования.

export const DEFAULT_PRICES = {
  paid: { 1: 700, 2: 1200, 3: 1600, 4: 2000, 5: 2400, 6: 2800, 7: 3000 },
  per8: 400,
  box: { 1: 900, 2: 1600, 3: 2200 },
  box4: 700,
  boxPromo: 600,
  prov: [3, 5, 7],
};

export const SET_PREFIX = "set:";
export const isSet = id => typeof id === "string" && id.startsWith(SET_PREFIX);
export const setId = b => SET_PREFIX + b.id;

export const paidPrice = (pr, P) => (P <= 0 ? 0 : P >= 8 ? P * pr.per8 : +pr.paid[P]);

export function plantQuote(pr, T, promo) {
  if (!T) return { T: 0, P: 0, G: 0, cap: 0, free: 0, price: 0, prov: false };
  const gifts = p => (promo ? p : Math.floor(p / 2));
  let P = 1;
  while (P + gifts(P) < T) P++;
  return { T, P, G: T - P, cap: gifts(P), free: P + gifts(P) - T, price: paidPrice(pr, P), prov: pr.prov.includes(P) };
}

export function boxPrice(pr, n, promo) {
  if (!n) return 0;
  if (promo) return pr.boxPromo * n;
  return n >= 4 ? pr.box4 * n : +pr.box[n];
}

// Сегодня по Москве: акции и сроки промокодов считаются по московскому времени.
export const today = (d = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow" }).format(d);

export function promoOn(s, now = today()) {
  if (s.promoAuto) return now >= s.promoStart && now <= s.promoEnd;
  return !!s.promo;
}

// Цена одной модели «по отдельности» — база для сравнения и для раскладки по чеку.
export const listPrice = (pr, m) => (m.cat === "box" ? boxPrice(pr, 1, false) : paidPrice(pr, 1));

// Раскладка суммы по позициям пропорционально базе; копейки (здесь рубли) — на последнюю позицию.
export function allocate(total, bases) {
  const sum = bases.reduce((a, b) => a + b, 0);
  if (!bases.length) return [];
  if (!sum) { const each = Math.floor(total / bases.length); return bases.map((_, i) => i === bases.length - 1 ? total - each * (bases.length - 1) : each); }
  const out = bases.map(b => Math.floor(total * b / sum));
  out[out.length - 1] += total - out.reduce((a, b) => a + b, 0);
  return out;
}

// Модели, которые покупатель уже купил (оплаченные и не отозванные заказы этого покупателя).
export function ownedIds(s) {
  const set = new Set();
  (s.orders || []).forEach(o => { if (o.own && o.status !== "revoked" && o.status !== "refunded") o.items.forEach(id => set.add(id)); });
  return set;
}
// Тестовые заказы (без оплаты) не дают скидку постоянного и не «расходуют» промокоды
const ownOrders = s => (s.orders || []).filter(o => o.own && o.status !== "refunded" && !o.test);

// Цена набора с учётом уже купленных моделей: платится только доля недостающих, округление до 10 ₽.
export function bundlePrice(b, owned) {
  const items = b.items || [];
  if (!items.length) return 0;
  const missing = items.filter(id => !owned.has(id)).length;
  if (missing === items.length) return +b.price;
  return Math.round(+b.price * missing / items.length / 10) * 10;
}

// Проверка промокода. Возвращает { code, amount } или { error }.
function checkCode(s, code, ctx) {
  const c = (s.promoCodes || []).find(x => !x.deleted && x.code.toUpperCase() === code.toUpperCase());
  if (!c) return { error: "Такого промокода нет" };
  const now = ctx.now;
  if (!c.active) return { error: "Промокод не действует" };
  if (c.from && now < c.from) return { error: "Промокод ещё не начал действовать" };
  if (c.to && now > c.to) return { error: "Срок промокода истёк" };
  const uses = (s.orders || []).filter(o => o.code && o.code.toUpperCase() === c.code.toUpperCase()).length;
  if (c.maxUses && uses >= c.maxUses) return { error: "Промокод закончился" };
  const mine = ownOrders(s);
  if (c.once && mine.some(o => o.code && o.code.toUpperCase() === c.code.toUpperCase())) return { error: "Вы уже использовали этот промокод" };
  if (c.firstOnly && mine.length) return { error: "Промокод только для первого заказа" };
  if (ctx.promo && !c.duringPromo) return { error: "Во время акции «1+1» промокоды не действуют" };
  // База — доля обычной части заказа, приходящаяся на модели нужной категории.
  let base = ctx.regular;
  if (c.category) {
    const shares = allocate(ctx.regular, ctx.regLines.map(l => l.base));
    base = ctx.regLines.reduce((a, l, i) => a + (l.category === c.category ? shares[i] : 0), 0);
    if (!base) return { error: `Промокод действует только на категорию «${ctx.catName(c.category)}»` };
  }
  if (c.minTotal && ctx.regular < c.minTotal) return { error: `Промокод действует от ${c.minTotal} ₽` };
  const amount = c.type === "fixed" ? Math.min(+c.value, base) : Math.round(base * +c.value / 100);
  return { code: c.code, amount, label: `Промокод ${c.code}` };
}

// opts: { now, cats } — дата (для тестов) и список категорий (для текста ошибок).
export function quote(s, byId, opts = {}) {
  const now = opts.now || today();
  const promo = promoOn(s, now), pr = s.prices;
  const owned = ownedIds(s);
  const sets = (s.bundles || []).filter(b => b.active && !b.deleted);
  const setById = Object.fromEntries(sets.map(b => [setId(b), b]));

  // 1. Наборы в корзине и их модели
  const inSets = (s.cart || []).filter(id => setById[id]).map(id => setById[id]);
  const setModels = new Set(inSets.flatMap(b => b.items));
  const bundles = inSets.map(b => ({ id: setId(b), b, price: bundlePrice(b, owned), items: b.items.filter(id => byId[id] && !owned.has(id)) }));
  const bundleTotal = bundles.reduce((a, x) => a + x.price, 0);

  // 2. Отдельные модели: без купленных и без тех, что уже входят в набор
  const single = (s.cart || []).filter(id => byId[id] && !owned.has(id) && !setModels.has(id));
  const plants = single.filter(id => byId[id].cat !== "box");
  const boxes = single.filter(id => byId[id].cat === "box");
  const pq = plantQuote(pr, plants.length, promo);
  const bp = boxPrice(pr, boxes.length, promo);
  const regular = pq.price + bp;
  const regLines = [...plants, ...boxes].map((id, i) => ({ id, base: listPrice(pr, byId[id]), category: byId[id].category, gift: i < plants.length && i >= pq.P }));

  // 3. Одна скидка на заказ: промокод или постоянный покупатель — что выгоднее
  const catName = id => (opts.cats || []).find(c => c.id === id)?.name || "другая";
  const ctx = { now, promo, regular, regLines, catName };
  const codeRes = s.code && regular ? checkCode(s, s.code, ctx) : s.code ? { error: "Промокод действует на модели вне наборов" } : null;
  const loy = s.loyalty || {};
  const loyaltyOk = loy.on && +loy.percent > 0 && ownOrders(s).length > 0 && regular > 0;
  const loyalty = loyaltyOk ? { amount: Math.round(regular * +loy.percent / 100), label: `Постоянному покупателю −${loy.percent}%`, kind: "loyalty" } : null;
  const fromCode = codeRes && !codeRes.error ? { ...codeRes, kind: "code" } : null;
  let discount = null, codeNote = codeRes?.error || "";
  if (fromCode && loyalty) {
    discount = fromCode.amount >= loyalty.amount ? fromCode : loyalty;
    if (discount === loyalty) codeNote = "Скидка постоянного покупателя больше — применена она";
  } else discount = fromCode || loyalty;
  if (discount && !discount.amount) discount = null;
  const off = discount ? Math.min(discount.amount, regular) : 0;
  const total = bundleTotal + regular - off;

  // Раскладка по позициям чека: наборы — внутри своей цены, остальное — внутри суммы после скидки
  const lines = [];
  bundles.forEach(x => {
    const bases = x.items.map(id => listPrice(pr, byId[id]));
    allocate(x.price, bases).forEach((p, i) => lines.push({ id: x.items[i], set: x.id, price: p }));
  });
  allocate(regular - off, regLines.map(l => l.base)).forEach((p, i) => lines.push({ id: regLines[i].id, gift: regLines[i].gift, price: p }));

  const list = lines.reduce((a, l) => a + listPrice(pr, byId[l.id]), 0);
  const nextPlant = plantQuote(pr, plants.length + 1, promo).price - pq.price;
  const nextBox = boxPrice(pr, boxes.length + 1, promo) - bp;
  return {
    plants, boxes, pq, bp, bundles, bundleTotal, regular, discount: discount ? { ...discount, amount: off } : null, codeNote,
    total, promo, owned, lines, save: Math.max(0, list - total), nextPlant, nextBox,
    count: plants.length + boxes.length + bundles.length, models: lines.length,
  };
}

// Сколько стоит добавить эту модель к текущей корзине: 0, если она пойдёт в подарок.
export function addCost(Q, m) {
  return m.cat === "box" ? Q.nextBox : Q.nextPlant;
}
