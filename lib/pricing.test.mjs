// Тесты расчёта цены: node --test lib/pricing.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PRICES, allocate, bundlePrice, plantQuote, quote, setId } from "./pricing.js";

const pr = DEFAULT_PRICES;
const NOW = "2026-11-12";
const M = (id, cat = "plant", category = "c-kashpo") => ({ id, cat, category });
const byId = Object.fromEntries([
  ...["a", "b", "c", "d", "e", "f", "g", "h"].map(id => [id, M(id)]),
  ["t1", M("t1", "plant", "c-lotki")], ["t2", M("t2", "plant", "c-lotki")],
  ["x1", M("x1", "box", "c-boksy")], ["x2", M("x2", "box", "c-boksy")],
]);
const base = over => ({ cart: [], prices: pr, promo: false, promoAuto: false, orders: [], promoCodes: [], bundles: [], loyalty: { on: false, percent: 10 }, code: "", ...over });

test("«2+1»: таблица из задания не изменилась", () => {
  const want = { 1: 700, 2: 1200, 3: 1200, 4: 1600, 5: 2000, 6: 2000, 7: 2400, 8: 2800, 9: 2800, 10: 3000, 11: 3200, 12: 3200 };
  for (const [T, price] of Object.entries(want)) assert.equal(plantQuote(pr, +T, false).price, price, `${T} моделей`);
});

test("«1+1»: 2 → 700, 4 → 1200, 8 → 2000, 12 → 2800, 16 → 3200", () => {
  for (const [T, price] of [[2, 700], [4, 1200], [8, 2000], [12, 2800], [16, 3200]]) assert.equal(plantQuote(pr, T, true).price, price);
});

test("боксы: 900 / 1600 / 2200 / от 4 по 700, по акции по 600", () => {
  assert.equal(quote(base({ cart: ["x1"] }), byId, { now: NOW }).total, 900);
  assert.equal(quote(base({ cart: ["x1", "x2"] }), byId, { now: NOW }).total, 1600);
  assert.equal(quote(base({ cart: ["x1", "x2"], promo: true }), byId, { now: NOW }).total, 1200);
});

test("раскладка по чеку всегда даёт ровно итог", () => {
  for (const [total, bases] of [[1200, [700, 700, 700]], [1000, [700, 900, 700]], [7, [1, 1, 1]], [0, [700]], [500, [0, 0]]]) {
    const out = allocate(total, bases);
    assert.equal(out.reduce((a, b) => a + b, 0), total);
    assert.equal(out.length, bases.length);
  }
  const Q = quote(base({ cart: ["a", "b", "c", "x1"] }), byId, { now: NOW });
  assert.equal(Q.lines.reduce((a, l) => a + l.price, 0), Q.total);
  assert.ok(Q.lines.every(l => l.price > 0), "подарок тоже получает долю, а не 0 ₽");
});

test("купленные модели не считаются и не оплачиваются второй раз", () => {
  const s = base({ cart: ["a", "b"], orders: [{ own: true, status: "paid", items: ["a"] }] });
  const Q = quote(s, byId, { now: NOW });
  assert.deepEqual(Q.plants, ["b"]);
  assert.equal(Q.total, 700);
});

const SET = { id: "kashpo5", name: "Все кашпо", items: ["a", "b", "c", "d", "e"], price: 1800, active: true };

test("набор: фиксированная цена, его модели не участвуют в «2+1»", () => {
  const Q = quote(base({ cart: [setId(SET), "a", "f"], bundles: [SET] }), byId, { now: NOW });
  assert.equal(Q.bundleTotal, 1800);
  assert.deepEqual(Q.plants, ["f"], "«a» уже в наборе, отдельно не считается");
  assert.equal(Q.total, 1800 + 700);
  assert.equal(Q.models, 6);
});

test("набор: если часть уже куплена, платится доля недостающих", () => {
  const owned = new Set(["a", "b"]);
  assert.equal(bundlePrice(SET, owned), 1080); // 1800 × 3/5
  const s = base({ cart: [setId(SET)], bundles: [SET], orders: [{ own: true, status: "paid", items: ["a", "b"] }] });
  assert.equal(quote(s, byId, { now: NOW }).total, 1080);
});

const CODES = [
  { code: "LOLA10", type: "percent", value: 10, active: true, duringPromo: false },
  { code: "MINUS300", type: "fixed", value: 300, active: true, minTotal: 1500 },
  { code: "OLD", type: "percent", value: 50, active: true, to: "2026-01-01" },
  { code: "FIRST", type: "percent", value: 20, active: true, firstOnly: true },
  { code: "LOTKI", type: "percent", value: 50, active: true, category: "c-lotki" },
  { code: "TWICE", type: "percent", value: 5, active: true, maxUses: 1 },
];

test("промокод: процент и фиксированная сумма, минимальная сумма", () => {
  const cart = ["a", "b", "c", "d"]; // 4 модели по «2+1» = 1600
  assert.equal(quote(base({ cart, promoCodes: CODES, code: "lola10" }), byId, { now: NOW }).total, 1440);
  assert.equal(quote(base({ cart, promoCodes: CODES, code: "MINUS300" }), byId, { now: NOW }).total, 1300);
  const small = quote(base({ cart: ["a"], promoCodes: CODES, code: "MINUS300" }), byId, { now: NOW });
  assert.match(small.codeNote, /от 1500/);
  assert.equal(small.total, 700);
});

test("промокод: срок, первый заказ, лимит использований, акция «1+1»", () => {
  const cart = ["a", "b"];
  assert.match(quote(base({ cart, promoCodes: CODES, code: "OLD" }), byId, { now: NOW }).codeNote, /истёк/);
  assert.match(quote(base({ cart, promoCodes: CODES, code: "FIRST", orders: [{ own: true, status: "paid", items: ["h"] }] }), byId, { now: NOW }).codeNote, /первого заказа/);
  assert.match(quote(base({ cart, promoCodes: CODES, code: "TWICE", orders: [{ code: "TWICE", items: ["h"] }] }), byId, { now: NOW }).codeNote, /закончился/);
  assert.match(quote(base({ cart, promo: true, promoCodes: CODES, code: "LOLA10" }), byId, { now: NOW }).codeNote, /1\+1/);
});

test("промокод на категорию считает скидку только с её моделей", () => {
  const Q = quote(base({ cart: ["a", "t1"], promoCodes: CODES, code: "LOTKI" }), byId, { now: NOW });
  // 2 модели = 1200, доля лотка 600, скидка 50% = 300
  assert.equal(Q.discount.amount, 300);
  assert.equal(Q.total, 900);
});

test("постоянный покупатель и промокод не суммируются — берётся большая скидка", () => {
  const orders = [{ own: true, status: "paid", items: ["h"] }];
  const loyalty = { on: true, percent: 10 };
  const cart = ["a", "b", "c", "d"]; // 1600
  const onlyLoyal = quote(base({ cart, orders, loyalty }), byId, { now: NOW });
  assert.equal(onlyLoyal.discount.kind, "loyalty");
  assert.equal(onlyLoyal.total, 1440);
  const withSmallCode = quote(base({ cart, orders, loyalty, promoCodes: [{ code: "FIVE", type: "percent", value: 5, active: true }], code: "FIVE" }), byId, { now: NOW });
  assert.equal(withSmallCode.discount.kind, "loyalty");
  assert.match(withSmallCode.codeNote, /постоянного/);
  const withBigCode = quote(base({ cart, orders, loyalty, promoCodes: CODES, code: "MINUS300" }), byId, { now: NOW });
  assert.equal(withBigCode.discount.kind, "code");
  assert.equal(withBigCode.total, 1300);
});

test("скидка заказа не действует на наборы", () => {
  const Q = quote(base({ cart: [setId(SET)], bundles: [SET], promoCodes: CODES, code: "LOLA10" }), byId, { now: NOW });
  assert.equal(Q.total, 1800);
  assert.ok(Q.codeNote);
});
