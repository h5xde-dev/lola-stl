import MockPay from "@/components/MockPay";
import { provider } from "@/lib/server/pay";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Тестовая оплата", robots: { index: false, follow: false } };
// Страница оплаты, пока не подключена ЮKassa: позволяет пройти весь путь заказа без денег.
export default async function Page({ params }) {
  if (provider() !== "mock") notFound();
  return <MockPay code={(await params).code} />;
}
