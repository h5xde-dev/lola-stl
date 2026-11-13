// Проверка всего пути покупки через API на чистой базе: rm -rf .data, сервер с ADMIN_PASSWORD=lola, затем npm run e2e
const B = process.env.BASE_URL || "http://localhost:3000";
const AL = process.env.ADMIN_LOGIN || "lola";
const jar = () => { const c = {}; return {
  async f(path, opts = {}) {
    const r = await fetch(B + path, { redirect: "manual", ...opts, headers: { "Content-Type": "application/json", Cookie: Object.entries(c).map(([k, v]) => `${k}=${v}`).join("; "), "x-forwarded-for": opts.ip || "10.0.0.1", ...(opts.headers || {}) } });
    for (const sc of r.headers.getSetCookie?.() || []) { const [kv] = sc.split(";"); const [k, ...v] = kv.split("="); v.join("=") ? c[k] = v.join("=") : delete c[k]; }
    return r;
  }, c }; };
const ok = (cond, msg) => { console.log((cond ? "✓ " : "✗ ") + msg); if (!cond) process.exitCode = 1; };
const j = r => r.json();

const A = jar(), Bx = jar(), adm = jar();
const home = await (await A.f("/")).text();
ok(home.includes("Глубина") && home.includes("Все кашпо"), "главная из базы: модели и набор");

// цена: набор + лоток + промокод
let q = await j(await A.f("/api/quote", { method: "POST", body: JSON.stringify({ cart: ["set:kashpo-all", "p07"], code: "LOLA10" }) }));
ok(q.total === 2430 && q.discount?.code === "LOLA10", `сервер считает 1800 + 700 − 70 = ${q.total}`);
q = await j(await A.f("/api/quote", { method: "POST", body: JSON.stringify({ cart: ["p07"], code: "NOPE" }) }));
ok(q.codeNote === "Такого промокода нет" && q.total === 700, "несуществующий промокод отклонён");

// заказ без согласия и с плохим email
let r = await A.f("/api/checkout", { method: "POST", body: JSON.stringify({ cart: ["p07"], email: "x" , agree: true }) });
ok(r.status === 400, "плохой email — ошибка 400");
// заказ
r = await A.f("/api/checkout", { method: "POST", body: JSON.stringify({ cart: ["set:kashpo-all", "p07"], code: "LOLA10", email: "Buyer@Example.ru", agree: true, channel: "site", method: "СБП", total: 1 }) });
const co = await j(r);
ok(r.status === 200 && co.total === 2430 && co.url.startsWith("/pay/mock/"), `заказ ${co.code} создан, сумма с сервера ${co.total}, клиентская 1 ₽ проигнорирована`);
ok(!!A.c.lola_o, "браузер покупателя получил доступ к заказу");
let st = await j(await A.f(`/api/orders/${co.code}`));
ok(st.status === "pending", "до оплаты заказ ждёт");
// чужой браузер не видит заказ и не может оплатить
ok((await Bx.f(`/api/orders/${co.code}`)).status === 404, "чужой браузер не видит заказ");
ok((await Bx.f("/api/pay/mock", { method: "POST", body: JSON.stringify({ order: co.code }) })).status === 404, "чужой браузер не может подтвердить оплату");
// оплата
await A.f("/api/pay/mock", { method: "POST", body: JSON.stringify({ order: co.code, action: "pay" }) });
st = await j(await A.f(`/api/orders/${co.code}`));
ok(st.status === "paid", "после оплаты заказ оплачен");
await A.f("/api/pay/mock", { method: "POST", body: JSON.stringify({ order: co.code, action: "pay" }) }); // повтор
let me = await j(await A.f("/api/me"));
ok(me.orders.length === 1 && me.orders[0].items.length === 6, "в «Моих покупках» заказ на 6 моделей");
ok(me.orders[0].lines.reduce((a, l) => a + l.price, 0) === 2430, "позиции чека в сумме = итог");

// скачивание
r = await A.f("/api/download", { method: "POST", body: JSON.stringify({ order: co.code, model: "p01" }) });
let dl = await j(r);
ok(r.status === 200 && dl.url.startsWith("/api/files/") && dl.left === 4, `ссылка выдана, осталось ${dl.left}`);
const file = await A.f(dl.url);
ok(file.status === 200 && /glubina_L-1001\.stl/.test(decodeURIComponent(file.headers.get("content-disposition"))), "файл отдаётся с номером заказа в имени");
ok((await Bx.f(dl.url)).status === 200, "ссылка на файл работает 5 минут у любого (поэтому короткая)");
ok((await A.f("/api/files/" + "x." + "y")).status === 410, "поддельный токен — 410");
ok((await Bx.f("/api/download", { method: "POST", body: JSON.stringify({ order: co.code, model: "p01" }) })).status === 403, "чужой браузер не получает ссылку");
ok((await A.f("/api/download", { method: "POST", body: JSON.stringify({ order: co.code, model: "p06" }) })).status === 404, "модели не из заказа — нет");
for (let i = 0; i < 4; i++) await A.f("/api/download", { method: "POST", body: JSON.stringify({ order: co.code, model: "p01" }) });
r = await A.f("/api/download", { method: "POST", body: JSON.stringify({ order: co.code, model: "p01" }) });
ok(r.status === 429, "шестое скачивание — лимит исчерпан");

// много сетей → проверка
for (const ip of ["20.0.1.5", "30.0.1.5"]) await A.f("/api/download", { ip, method: "POST", body: JSON.stringify({ order: co.code, model: "p02" }) });
r = await A.f("/api/download", { ip: "40.0.1.5", method: "POST", body: JSON.stringify({ order: co.code, model: "p02" }) });
ok(r.status === 423, "четвёртая сеть за сутки — заказ на проверке");

// админка
ok((await adm.f("/api/admin/state")).status === 401, "админка без входа закрыта");
ok((await adm.f("/api/admin/login", { method: "POST", body: JSON.stringify({ login: AL, password: "wrong" }) })).status === 401, "неверный пароль не пускает");
await adm.f("/api/admin/login", { method: "POST", body: JSON.stringify({ login: AL, password: process.env.ADMIN_PASSWORD || "lola" }) });
let as = await j(await adm.f("/api/admin/state"));
ok(as.orders[0].status === "review" && as.orders[0].log.length >= 7, `админка видит заказ на проверке и журнал (${as.orders[0].log.length})`);
await adm.f(`/api/admin/orders/${co.code}`, { method: "POST", body: JSON.stringify({ action: "open" }) });
await adm.f(`/api/admin/orders/${co.code}`, { method: "POST", body: JSON.stringify({ action: "reset" }) });
me = await j(await A.f("/api/me"));
ok(me.orders[0].status === "paid" && !me.orders[0].downloads.p01, "доступ открыт, лимит сброшен");

// вход по ссылке из письма на «другом устройстве»
await Bx.f("/api/auth/request", { method: "POST", body: JSON.stringify({ email: "buyer@example.ru" }) });
const box = await j(await adm.f("/api/admin/outbox"));
const mail = box.items.find(m => m.subject?.includes("Ссылка на ваши покупки"));
ok(!!mail && box.items.some(m => m.subject?.includes("файлы готовы")), "письмо после оплаты и письмо со ссылкой в журнале");
const link = mail.body.match(/http\S+magic\?t=\S+/)[0].replace(/^https?:\/\/[^/]+/, "");
r = await Bx.f(link);
ok(r.status === 307 && r.headers.get("location").includes("welcome"), "ссылка из письма открывает покупки");
me = await j(await Bx.f("/api/me"));
ok(me.orders.length === 1 && me.customer?.email === "buyer@example.ru", "на другом устройстве видны покупки");
r = await jar().f(link);
ok(r.headers.get("location").includes("expired"), "повторное открытие ссылки не работает");

// повторная покупка: купленное исключено, LOLA10 уже использован, скидка постоянного
q = await j(await Bx.f("/api/quote", { method: "POST", body: JSON.stringify({ cart: ["p01", "p06"], code: "LOLA10" }) }));
ok(q.lines.length === 1 && q.lines[0].id === "p06", "купленная модель не считается второй раз");
ok(q.discount?.kind === "loyalty" && q.total === 630 && /использовали|постоянного/.test(q.codeNote), `скидка постоянного: ${q.total} ₽, промокод: «${q.codeNote}»`);
// чужой email не даёт скидку постоянного
const C = jar();
r = await C.f("/api/checkout", { method: "POST", body: JSON.stringify({ cart: ["p06"], email: "buyer@example.ru", agree: true }) });
ok((await j(r)).total === 700, "чужой email без входа не даёт скидку постоянного");

// автосохранение админки: включить акцию 1+1
await adm.f("/api/admin/state", { method: "PUT", body: JSON.stringify({ promo: true }) });
q = await j(await jar().f("/api/quote", { method: "POST", body: JSON.stringify({ cart: ["p03", "p04"] }) }));
ok(q.total === 700 && q.promo, "акция 1+1 из админки сразу действует: 2 модели = 700 ₽");
await adm.f("/api/admin/state", { method: "PUT", body: JSON.stringify({ promo: false }) });
