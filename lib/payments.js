// Способы оплаты. Владелица включает и выключает их в админке → «Оплата».
// yk — тип способа в ЮKassa: покупатель сразу попадает на нужную форму оплаты.
export const PAY_METHODS = [
  { id: "sbp", name: "СБП", note: "По QR-коду или из приложения банка", icon: "⚡", yk: "sbp" },
  { id: "card", name: "Банковская карта", note: "Мир, Visa, Mastercard российских банков", icon: "₽", yk: "bank_card" },
  { id: "sberpay", name: "SberPay", note: "В приложении СберБанк Онлайн", icon: "С", yk: "sberbank" },
  { id: "tpay", name: "T-Pay", note: "В приложении Т-Банка", icon: "Т", yk: "tinkoff_bank" },
  { id: "test", name: "Тестовая оплата", note: "Без списания денег — для проверки магазина", icon: "✓", test: true },
];
export const methodById = id => PAY_METHODS.find(m => m.id === id) || null;

// test: включена ли тестовая оплата; testFor: "admin" — видит только вошедшая в админку, "all" — все посетители
export const DEFAULT_PAYMENTS = { sbp: true, card: true, sberpay: false, tpay: false, test: false, testFor: "admin" };
export const mergePayments = saved => ({ ...DEFAULT_PAYMENTS, ...(saved || {}) });
