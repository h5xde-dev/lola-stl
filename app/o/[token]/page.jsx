import { WhenReady } from "@/components/Store";
import { OrderLinkView } from "@/components/CartViews";
export const metadata = { title: "Заказ", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Page({ params }) {
  const { token } = await params;
  return <WhenReady><OrderLinkView token={token} /></WhenReady>;
}
