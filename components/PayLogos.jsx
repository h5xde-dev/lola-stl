// Значки принимаемых способов оплаты для подвала и страницы «Оплата».
// Нейтральные текстовые значки: названия платёжных систем без воспроизведения их логотипов.
const ITEMS = [
  { id: "mir", label: "МИР", title: "Карты «Мир»" },
  { id: "visa", label: "VISA", title: "Карты Visa" },
  { id: "mc", label: "Mastercard", title: "Карты Mastercard" },
  { id: "sbp", label: "СБП", title: "Система быстрых платежей" },
];

export default function PayLogos({ small = false }) {
  return (
    <ul className={"pay-logos" + (small ? " small" : "")} aria-label="Принимаем к оплате">
      {ITEMS.map(x => <li key={x.id} className={"pay-logo " + x.id} title={x.title}>{x.label}</li>)}
    </ul>
  );
}
