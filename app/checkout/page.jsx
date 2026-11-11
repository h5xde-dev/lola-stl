import { WhenReady } from "@/components/Store";
import { CheckoutView } from "@/components/CartViews";
export const metadata = { title: "Оформление", robots: { index: false, follow: false } };
export default function Page() { return <WhenReady><CheckoutView /></WhenReady>; }
