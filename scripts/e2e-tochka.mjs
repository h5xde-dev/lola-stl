// Проверка оплаты через Точку на заглушке её API (без настоящих денег и без интернета).
// Запуск на чистой базе:
//   rm -rf .data && PAYMENT_CHECK_SECONDS=2 TOCHKA_JWT=test-jwt TOCHKA_CLIENT_ID=cid TOCHKA_API=http://127.0.0.1:3399 \
//     TOCHKA_PUBLIC_KEY=/tmp/tochka-test-key.json AUTH_SECRET=test ADMIN_LOGIN=lola ADMIN_PASSWORD=lola DEMO=off PORT=3311 npm start
//   BASE_URL=http://localhost:3311 TOCHKA_PUBLIC_KEY=/tmp/tochka-test-key.json node scripts/e2e-tochka.mjs
// Скрипт сам поднимает заглушку API на :3399 и пишет открытый ключ подписи вебхуков в TOCHKA_PUBLIC_KEY.
import http from "node:http";
import { generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { writeFileSync } from "node:fs";

const B = process.env.BASE_URL || "http://localhost:3311";
const KEY_PATH = process.env.TOCHKA_PUBLIC_KEY || "/tmp/tochka-test-key.json";
const ok = (cond, msg) => { console.log((cond ? "✓ " : "✗ ") + msg); if (!cond) process.exitCode = 1; };
const j = r => r.json();
const jar = () => { const c = {}; return {
  async f(path, opts = {}) {
    const r = await fetch(B + path, { redirect: "manual", ...opts, headers: { "Content-Type": "application/json", Cookie: Object.entries(c).map(([k, v]) => `${k}=${v}`).join("; "), "x-forwarded-for": "10.0.0.7", ...(opts.headers || {}) } });
    for (const sc of r.headers.getSetCookie?.() || []) { const [kv] = sc.split(";"); const [k, ...v] = kv.split("="); v.join("=") ? c[k] = v.join("=") : delete c[k]; }
    return r;
  }, c }; };

// Ключ «Точки» для подписи вебхуков и чужой ключ для подделки
const bank = generateKeyPairSync("rsa", { modulusLength: 2048 });
const evil = generateKeyPairSync("rsa", { modulusLength: 2048 });
writeFileSync(KEY_PATH, JSON.stringify(bank.publicKey.export({ format: "jwk" })));
const jwt = (payload, key) => {
  const h = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${h}.${p}.${sign("RSA-SHA256", Buffer.from(`${h}.${p}`), key).toString("base64url")}`;
};

// Заглушка API Точки
const ops = {}, calls = [];
const mock = http.createServer((req, res) => {
  let raw = "";
  req.on("data", d => (raw += d));
  req.on("end", () => {
    const body = raw ? JSON.parse(raw) : null, url = new URL(req.url, "http://x");
    calls.push({ method: req.method, path: url.pathname, body, auth: req.headers.authorization });
    const send = (code, data) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(data)); };
    if (req.headers.authorization !== "Bearer test-jwt") return send(401, { message: "unauthorized" });
    let m;
    if (url.pathname === "/open-banking/v1.0/customers") return send(200, { Data: { Customer: [{ customerCode: "300000092", customerType: "Business", shortName: "ИП Тестова А. С." }] } });
    if (url.pathname === "/acquiring/v1.0/retailers") return send(200, { Data: { Retailer: [{ status: "REG", isActive: true, mcc: "5815", rate: 2.3, name: "lola.stl", url: "https://greennessx.ru", merchantId: "200000000001056", terminalId: "1", paymentModes: ["sbp", "card"], cashbox: "Касса партнёра" }] } });
    if (url.pathname === "/acquiring/v1.0/payments_with_receipt" && req.method === "POST") {
      const id = randomUUID();
      ops[id] = { ...body.Data, operationId: id, status: "CREATED" };
      return send(200, { Data: { ...ops[id], paymentLink: `https://pay.example/${id}` } });
    }
    if ((m = url.pathname.match(/^\/acquiring\/v1\.0\/payments\/([^/]+)\/refund$/))) {
      const o = ops[m[1]];
      if (!o || o.status !== "APPROVED") return send(400, { Errors: [{ message: "Статус платежа не APPROVED" }] });
      o.status = "REFUNDED"; o.refund = body.Data.amount;
      return send(200, { Data: { isRefund: true, operationId: o.operationId, amount: body.Data.amount, date: new Date().toISOString(), orderId: "r-" + o.operationId.slice(0, 6) } });
    }
    if ((m = url.pathname.match(/^\/acquiring\/v1\.0\/payments\/([^/]+)$/))) {
      const o = ops[m[1]];
      return o ? send(200, { Data: { Operation: [{ ...o, paymentType: "sbp", Order: [] }] } }) : send(404, { message: "not found" });
    }
    if ((m = url.pathname.match(/^\/webhook\/v1\.0\/([^/]+)$/)) && req.method === "PUT") return send(200, { Data: body });
    send(404, { message: "no route " + url.pathname });
  });
});
await new Promise(r => mock.listen(3399, "127.0.0.1", r));

try {
  const adm = jar();
  await adm.f("/api/admin/login", { method: "POST", body: JSON.stringify({ login: process.env.ADMIN_LOGIN || "lola", password: process.env.ADMIN_PASSWORD || "lola" }) });
  await adm.f("/api/admin/state", { method: "PUT", body: JSON.stringify({ payments: { sbp: true, card: true, tpay: true, dolyame: false, test: false } }) });
  let as = await j(await adm.f("/api/admin/state"));
  ok(as.services.payProvider === "tochka" && as.services.tochka, "провайдер оплаты — Точка");

  // проверка соединения: код клиента, торговая точка, способы оплаты
  let r = await adm.f("/api/admin/tochka", { method: "POST", body: JSON.stringify({ action: "check" }) });
  let t = await j(r);
  ok(r.status === 200 && t.info.customerCode === "300000092" && t.info.merchantId === "200000000001056" && t.info.ready && t.info.modes.join() === "sbp,card", "«Проверить соединение»: торговая точка и способы оплаты из API");
  ok(calls.every(c => c.auth === "Bearer test-jwt"), "запросы к Точке идут с JWT-ключом");
  r = await adm.f("/api/admin/tochka", { method: "POST", body: JSON.stringify({ action: "webhook" }) });
  const wh = calls.find(c => c.method === "PUT" && c.path === "/webhook/v1.0/cid");
  ok(r.status === 200 && wh?.body.webhooksList.join() === "acquiringInternetPayment" && wh.body.url.endsWith("/api/tochka/webhook"), "уведомления об оплате подключаются на /api/tochka/webhook");

  // T-Pay включён в админке, но не подключён у торговой точки — недоступен
  const A = jar();
  r = await A.f("/api/checkout", { method: "POST", body: JSON.stringify({ cart: ["p07"], email: "buyer@example.ru", agree: true, pd: true, method: "tpay" }) });
  ok(r.status === 400, "способ, не подключённый у торговой точки, недоступен");

  // заказ: платёжная ссылка с чеком
  r = await A.f("/api/checkout", { method: "POST", body: JSON.stringify({ cart: ["p01", "p02", "p03", "p07"], email: "buyer@example.ru", agree: true, pd: true, method: "sbp" }) });
  const co = await j(r);
  const op = Object.values(ops).find(o => o.paymentLinkId === co.code);
  ok(r.status === 200 && co.url === `https://pay.example/${op?.operationId}`, `заказ ${co.code} ведёт на платёжную ссылку Точки`);
  const sum = op.Items.reduce((a, i) => a + i.amount * i.quantity, 0);
  ok(op.amount === co.total && Math.abs(sum - co.total) < 0.001 && op.Items.every(i => i.amount > 0), `позиции чека (${op.Items.length}) в сумме = итог ${co.total} ₽, нулевых строк нет`);
  ok(op.paymentMode.join() === "sbp" && op.Client.email === "buyer@example.ru" && op.customerCode === "300000092" && op.merchantId === "200000000001056", "в ссылке: способ СБП, email для чека, код клиента и торговая точка");
  ok(/\/checkout\/return\?order=L-\d+&t=[\w-]{16,}$/.test(op.redirectUrl) && op.redirectUrl.includes(co.code) && op.Items[0].paymentObject === "service" && op.Items[0].vatType === "none", "адрес возврата и признаки чека");

  // поддельный вебхук не оплачивает заказ, даже если платёж оплачен
  op.status = "APPROVED";
  r = await fetch(B + "/api/tochka/webhook", { method: "POST", headers: { "Content-Type": "text/plain" }, body: jwt({ webhookType: "acquiringInternetPayment", operationId: op.operationId, status: "APPROVED" }, evil.privateKey) });
  as = await j(await adm.f("/api/admin/state"));
  ok(r.status === 200 && !as.orders.some(o => o.id === co.code), "вебхук с чужой подписью отклонён, заказ не оплачен");

  // настоящий вебхук: подпись Точки, статус перезапрашивается через API
  r = await fetch(B + "/api/tochka/webhook", { method: "POST", headers: { "Content-Type": "text/plain" }, body: jwt({ webhookType: "acquiringInternetPayment", operationId: op.operationId, status: "APPROVED", amount: co.total }, bank.privateKey) });
  let st = await j(await A.f(`/api/orders/${co.code}`));
  ok(r.status === 200 && st.status === "paid", "вебхук с подписью Точки подтверждает оплату");
  r = await A.f("/api/download", { method: "POST", body: JSON.stringify({ order: co.code, model: "p07" }) });
  ok(r.status === 200, "после оплаты файл скачивается");

  // без вебхука: страница возврата сама спрашивает статус у Точки
  const Bx = jar();
  r = await Bx.f("/api/checkout", { method: "POST", body: JSON.stringify({ cart: ["p06"], email: "second@example.ru", agree: true, pd: true, method: "card" }) });
  const co2 = await j(r);
  const op2 = Object.values(ops).find(o => o.paymentLinkId === co2.code);
  st = await j(await Bx.f(`/api/orders/${co2.code}`));
  ok(st.status === "pending" && op2.paymentMode.join() === "card", "пока платёж не прошёл, заказ ждёт оплаты");
  // покупатель вернулся из приложения банка в другой браузер (без куки заказа):
  // по токену из адреса возврата заказ находится, а после оплаты файлы скачиваются
  const tok = new URL(op2.redirectUrl).searchParams.get("t");
  const Other = jar();
  let o2 = await j(await Other.f(`/api/o/${tok}`));
  ok(o2.pending && o2.code === co2.code, "по ссылке возврата в другом браузере видно, что заказ ждёт оплаты");
  op2.status = "APPROVED";
  o2 = await j(await Other.f(`/api/o/${tok}`));
  r = await Other.f("/api/download", { method: "POST", body: JSON.stringify({ order: co2.code, model: "p06" }) });
  ok(o2.order?.id === co2.code && r.status === 200, "в другом браузере оплата подтверждается по ссылке возврата и файл скачивается");
  st = await j(await Bx.f(`/api/orders/${co2.code}`));
  ok(st.status === "paid", "без вебхука оплата подтверждается запросом статуса в Точку");

  // без вебхука и без возврата покупателя на сайт: фоновая проверка сама находит оплату
  // (сервер запущен с PAYMENT_CHECK_SECONDS=2)
  const Cx = jar();
  r = await Cx.f("/api/checkout", { method: "POST", body: JSON.stringify({ cart: ["p05"], email: "third@example.ru", agree: true, pd: true, method: "sbp" }) });
  const co3 = await j(r);
  const op3 = Object.values(ops).find(o => o.paymentLinkId === co3.code);
  op3.status = "APPROVED";
  let seen = false;
  for (let i = 0; i < 15 && !seen; i++) {
    await new Promise(res => setTimeout(res, 1000));
    as = await j(await adm.f("/api/admin/state"));
    seen = as.orders.find(o => o.id === co3.code)?.status === "paid";
  }
  ok(seen, "покупатель закрыл страницу банка — фоновая проверка сама подтвердила оплату");

  // возврат из админки: деньги через Точку, доступ закрыт
  r = await adm.f(`/api/admin/orders/${co.code}`, { method: "POST", body: JSON.stringify({ action: "refund" }) });
  ok(r.status === 200 && op.status === "REFUNDED" && op.refund === co.total, `возврат ${co.total} ₽ через API Точки`);
  as = await j(await adm.f("/api/admin/state"));
  ok(as.orders.find(o => o.id === co.code)?.status === "refunded", "заказ помечен «Возврат»");
  r = await A.f("/api/download", { method: "POST", body: JSON.stringify({ order: co.code, model: "p07" }) });
  ok(r.status === 403, "после возврата файлы недоступны");
  r = await adm.f(`/api/admin/orders/${co.code}`, { method: "POST", body: JSON.stringify({ action: "refund" }) });
  ok(r.status === 400, "повторный возврат невозможен");
  const out = await j(await adm.f("/api/admin/outbox"));
  ok((out.items || out.list || out).some?.(m => /возврат денег/.test(m.subject || "")), "покупателю ушло письмо о возврате");
} finally {
  mock.close();
}
