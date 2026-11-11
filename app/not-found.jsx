import Link from "next/link";
export const metadata = { title: "Страница не найдена", robots: { index: false } };
export default function NotFound() {
  return <div className="inner-page"><h1>Такой страницы нет</h1><div className="empty">Возможно, модель убрали из каталога. <Link href="/">Перейти в каталог</Link></div></div>;
}
