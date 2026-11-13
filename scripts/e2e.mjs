// Проверка всего пути покупки через API на чистой базе: rm -rf .data, сервер в рабочем режиме с ADMIN_LOGIN=lola ADMIN_PASSWORD=lola DEMO=off, затем npm run e2e
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
// Оплата: без ЮKassa и без тестовой оплаты оформить заказ нельзя; тестовая включается из админки
await adm.f("/api/admin/login", { method: "POST", body: JSON.stringify({ login: AL, password: process.env.ADMIN_PASSWORD || "lola" }) });
await adm.f("/api/admin/state", { method: "PUT", body: JSON.stringify({ payments: { test: false } }) });
let r0 = await jar().f("/api/checkout", { method: "POST", body: JSON.stringify({ cart: ["p07"], email: "a@b.ru", agree: true, method: "test" }) });
ok(r0.status === 400 && /не подключена/.test((await j(r0)).error), "без способов оплаты заказ не оформить");
await adm.f("/api/admin/state", { method: "PUT", body: JSON.stringify({ payments: { test: true, testFor: "admin" } }) });
r0 = await jar().f("/api/checkout", { method: "POST", body: JSON.stringify({ cart: ["p07"], email: "a@b.ru", agree: true, method: "test" }) });
ok(r0.status === 400, "тестовая оплата «только мне» недоступна посетителю");
r0 = await adm.f("/api/checkout", { method: "POST", body: JSON.stringify({ cart: ["p07"], email: "owner@b.ru", agree: true, method: "test" }) });
ok(r0.status === 200 && (await j(r0)).url.startsWith("/pay/mock/"), "владелице тестовая оплата доступна");
r0 = await jar().f("/api/checkout", { method: "POST", body: JSON.stringify({ cart: ["p07"], email: "a@b.ru", agree: true, method: "sbp" }) });
ok(r0.status === 400, "СБП без ЮKassa недоступна");
await adm.f("/api/admin/state", { method: "PUT", body: JSON.stringify({ payments: { test: true, testFor: "all", sbp: true, card: true } }) });
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
r = await A.f("/api/checkout", { method: "POST", body: JSON.stringify({ cart: ["set:kashpo-all", "p07"], code: "LOLA10", email: "Buyer@Example.ru", agree: true, channel: "site", method: "test", total: 1 }) });
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
ok(file.status === 200 && new RegExp(`glubina_${co.code}\\.stl`).test(decodeURIComponent(file.headers.get("content-disposition"))), "файл отдаётся с номером заказа в имени");
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
ok((await jar().f("/api/admin/state")).status === 401, "админка без входа закрыта");
ok((await adm.f("/api/admin/login", { method: "POST", body: JSON.stringify({ login: AL, password: "wrong" }) })).status === 401, "неверный пароль не пускает");
let as = await j(await adm.f("/api/admin/state"));
ok(as.orders[0].status === "review" && as.orders[0].log.length >= 7, `админка видит заказ на проверке и журнал (${as.orders[0].log.length})`);
await adm.f(`/api/admin/orders/${co.code}`, { method: "POST", body: JSON.stringify({ action: "open" }) });
await adm.f(`/api/admin/orders/${co.code}`, { method: "POST", body: JSON.stringify({ action: "reset" }) });
me = await j(await A.f("/api/me"));
ok(me.orders[0].status === "paid" && !me.orders[0].downloads.p01, "доступ открыт, лимит сброшен");

// вход по ссылке из письма на «другом устройстве»
await Bx.f("/api/auth/request", { method: "POST", body: JSON.stringify({ email: "buyer@example.ru" }) });
const box = await j(await adm.f("/api/admin/outbox"));
const mail = box.items.find(m => m.subject?.includes("Вход в личный кабинет"));
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
ok(q.discount?.kind === "code" && q.total === 630, `тестовый заказ не даёт скидку постоянного и не расходует промокод: ${q.total} ₽`);
// чужой email не даёт скидку постоянного
const C = jar();
r = await C.f("/api/checkout", { method: "POST", body: JSON.stringify({ cart: ["p06"], email: "buyer@example.ru", agree: true, method: "test" }) });
ok((await j(r)).total === 700, "чужой email без входа не даёт скидку постоянного");

// автосохранение админки: включить акцию 1+1
await adm.f("/api/admin/state", { method: "PUT", body: JSON.stringify({ promo: true }) });
q = await j(await jar().f("/api/quote", { method: "POST", body: JSON.stringify({ cart: ["p03", "p04"] }) }));
ok(q.total === 700 && q.promo, "акция 1+1 из админки сразу действует: 2 модели = 700 ₽");
await adm.f("/api/admin/state", { method: "PUT", body: JSON.stringify({ promo: false }) });

// постоянная ссылка на заказ из письма: работает много раз и на любом устройстве, открывает чек
const paidMail = box.items.find(m => m.subject?.includes("файлы готовы"));
const oLink = paidMail.body.match(/https?:\/\/\S+\/o\/([A-Za-z0-9_-]+)/);
ok(!!oLink, "в письме постоянная ссылка на заказ");
const D = jar();
for (let i = 0; i < 2; i++) {
  const o = await j(await D.f(`/api/o/${oLink[1]}`));
  ok(o.order?.items.includes("p01") && o.order.link === `/o/${oLink[1]}`, `ссылка на заказ открывается (${i + 1}-й раз)`);
}
r = await D.f("/api/download", { method: "POST", body: JSON.stringify({ order: co.code, model: "p07" }), ip: "10.0.0.1" });
ok(r.status === 200, "по ссылке на заказ можно скачать файл");
ok((await jar().f("/api/o/notarealtoken12345")).status === 404, "чужая ссылка не открывается");
const rc = await (await jar().f(`/o/${oLink[1]}/receipt`)).text();
ok(rc.includes("Чек заказа " + co.code) && rc.includes("Итого"), "чек заказа открывается по ссылке");
me = await j(await Bx.f("/api/me"));
ok(me.orders[0].link && me.orders[0].receipt === false, "в кабинете у заказа есть ссылка и чек");

// содержимое из админки: главная, SEO, статья
await adm.f("/api/admin/state", { method: "PUT", body: JSON.stringify({
  home: { title: "Тестовый заголовок", hero: [{ src: "/images/works/korall.jpg", alt: "коралл" }] },
  seo: { title: "SEO-заголовок теста", description: "SEO-описание теста" },
  company: { name: "ИП Тестова", inn: "770000000000" },
  articles: [{ id: "a1", slug: "pervaya", title: "Первая статья", date: "2026-11-01", excerpt: "Кратко", body: "## Раздел\n\nТекст с **жирным**.\n\n{{model:glubina}}", published: true, cover: { src: "/images/works/grani.jpg", alt: "" } }],
}) });
const h2 = await (await jar().f("/")).text();
ok(h2.includes("Тестовый заголовок") && h2.includes("SEO-заголовок теста") && h2.includes("korall"), "главная и SEO из админки");
ok(h2.includes("ИП Тестова") && h2.includes('href="/blog"'), "реквизиты в подвале, ссылка на статьи");
const art = await (await jar().f("/blog/pervaya")).text();
ok(art.includes("Первая статья") && art.includes("<strong>жирным</strong>") && art.includes("BlogPosting") && art.includes("Глубина"), "статья: текст, разметка, карточка модели");
ok((await (await jar().f("/sitemap.xml")).text()).includes("/blog/pervaya"), "статья в карте сайта");
ok(!(await (await jar().f("/")).text()).includes('href="/admin'), "на сайте нет ссылок на админку (сервер с DEMO=off)");

// картинка из админки
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
r = await adm.f("/api/admin/media?name=test.png", { method: "POST", body: png, headers: { "Content-Type": "application/octet-stream" } });
const med = await j(r);
ok(r.status === 200 && med.src?.startsWith("/media/"), "картинка загружена");
ok((await jar().f(med.src)).headers.get("content-type") === "image/png", "картинка отдаётся");
ok((await adm.f("/api/admin/media", { method: "POST", body: "<svg/>", headers: { "Content-Type": "application/octet-stream" } })).status === 400, "не-картинка отклонена");
ok((await jar().f("/api/admin/media", { method: "POST", body: png })).status === 401, "без входа загрузить нельзя");

// аналитика
const an = await j(await adm.f("/api/admin/analytics?days=30"));
ok(an.kpi.orders === 0 && an.testOrders >= 1 && an.series.length >= 30, `аналитика не считает тестовые заказы (${an.testOrders})`);
as = await j(await adm.f("/api/admin/state"));
ok(as.orders.every(o => o.test) && as.testOrders >= 1, "заказы помечены как тестовые");
const del = await j(await adm.f("/api/admin/test-orders", { method: "DELETE" }));
as = await j(await adm.f("/api/admin/state"));
ok(del.deleted >= 1 && as.orders.length === 0, `тестовые заказы удалены (${del.deleted})`);
await adm.f("/api/admin/state", { method: "PUT", body: JSON.stringify({ payments: { test: false } }) });
ok((await jar().f(`/pay/mock/${co.code}`)).status === 404, "страница тестовой оплаты закрыта, когда тест выключен");
ok((await jar().f("/api/admin/analytics")).status === 401, "аналитика только для админа");
