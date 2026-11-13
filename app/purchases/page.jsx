import { permanentRedirect } from "next/navigation";
// Старый адрес «Мои покупки» из прежних писем и кнопок бота ведёт в личный кабинет.
export default async function Page({ searchParams }) {
  const q = new URLSearchParams(await searchParams).toString();
  permanentRedirect("/account" + (q ? "?" + q : ""));
}
