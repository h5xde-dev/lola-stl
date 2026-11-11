// Расчёт цены. Все функции чистые: на вход цены и состояние акции, на выход сумма.
// 3, 5, 7 оплачиваемых моделей — предварительные цены, ждут согласования.

export const DEFAULT_PRICES = {
  paid: { 1: 700, 2: 1200, 3: 1600, 4: 2000, 5: 2400, 6: 2800, 7: 3000 },
  per8: 400,
  box: { 1: 900, 2: 1600, 3: 2200 },
  box4: 700,
  boxPromo: 600,
  prov: [3, 5, 7],
};

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

const today = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};

export function promoOn(s) {
  if (s.promoAuto) { const t = today(); return t >= s.promoStart && t <= s.promoEnd; }
  return !!s.promo;
}

export function quote(s, byId) {
  const plants = s.cart.filter(id => byId[id] && byId[id].cat === "plant");
  const boxes = s.cart.filter(id => byId[id] && byId[id].cat === "box");
  const promo = promoOn(s), pr = s.prices;
  const pq = plantQuote(pr, plants.length, promo);
  const bp = boxPrice(pr, boxes.length, promo);
  const total = pq.price + bp;
  const list = plants.length * paidPrice(pr, 1) + boxes.length * boxPrice(pr, 1, false);
  const nextPlant = plantQuote(pr, plants.length + 1, promo).price - pq.price;
  const nextBox = boxPrice(pr, boxes.length + 1, promo) - bp;
  return { plants, boxes, pq, bp, total, promo, save: Math.max(0, list - total), nextPlant, nextBox, count: s.cart.length };
}

// Сколько стоит добавить эту модель к текущей корзине: 0, если она пойдёт в подарок.
export function addCost(Q, m) {
  return m.cat === "box" ? Q.nextBox : Q.nextPlant;
}
