// Способы оплаты. Владелица включает и выключает их в админке → «Оплата».
// tochka — способ в API интернет-эквайринга Точки (paymentMode), yk — тип способа в ЮKassa.
// Способ без кода для текущего провайдера покупателям не показывается.
export const PAY_METHODS = [
  { id: "sbp", name: "СБП", note: "По QR-коду или из приложения банка", icon: "⚡", tochka: "sbp", yk: "sbp" },
  { id: "card", name: "Банковская карта", note: "Мир, Visa, Mastercard российских банков", icon: "₽", tochka: "card", yk: "bank_card" },
  { id: "tpay", name: "T-Pay", note: "В приложении Т-Банка", icon: "Т", tochka: "tinkoff", yk: "tinkoff_bank" },
  { id: "dolyame", name: "Долями", note: "Четыре части раз в две недели, без переплаты", icon: "¼", tochka: "dolyame" },
  { id: "sberpay", name: "SberPay", note: "В приложении СберБанк Онлайн", icon: "С", yk: "sberbank" },
  { id: "test", name: "Тестовая оплата", note: "Без списания денег — для проверки магазина", icon: "✓", test: true },
];
export const methodById = id => PAY_METHODS.find(m => m.id === id) || null;
// Работает ли способ у провайдера: "tochka" | "yookassa"
export const methodFor = (m, prov) => (m.test ? true : prov === "tochka" ? !!m.tochka : prov === "yookassa" ? !!m.yk : false);

// test: включена ли тестовая оплата; testFor: "admin" — видит только вошедшая в админку, "all" — все посетители
export const DEFAULT_PAYMENTS = { sbp: true, card: true, tpay: false, dolyame: false, sberpay: false, test: false, testFor: "admin" };
export const mergePayments = saved => ({ ...DEFAULT_PAYMENTS, ...(saved || {}) });
