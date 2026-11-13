import { notFound } from "next/navigation";
import MockPay from "@/components/MockPay";
import { testEnabled } from "@/lib/server/pay";
import { getSettings } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Тестовая оплата", robots: { index: false, follow: false } };
// Страница тестовой оплаты: весь путь заказа без денег. Включается в админке → «Оплата».
export default async function Page({ params }) {
  if (!testEnabled(await getSettings())) notFound();
  return <MockPay code={(await params).code} />;
}
