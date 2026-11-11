import { WhenReady } from "@/components/Store";
import { PurchasesView } from "@/components/CartViews";
export const metadata = { title: "Мои покупки", robots: { index: false, follow: false } };
export default function Page() { return <WhenReady><PurchasesView /></WhenReady>; }
