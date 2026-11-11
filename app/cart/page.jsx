import { WhenReady } from "@/components/Store";
import { CartView } from "@/components/CartViews";
export const metadata = { title: "Корзина", robots: { index: false, follow: false } };
export default function Page() { return <WhenReady><CartView /></WhenReady>; }
