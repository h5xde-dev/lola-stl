import { Suspense } from "react";
import { WhenReady } from "@/components/Store";
import { ReturnView } from "@/components/CartViews";
export const metadata = { title: "Проверяем оплату", robots: { index: false, follow: false } };
export default function Page() { return <WhenReady><Suspense><ReturnView /></Suspense></WhenReady>; }
