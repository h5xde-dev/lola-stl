import { Suspense } from "react";
import { WhenReady } from "@/components/Store";
import { AccountView } from "@/components/CartViews";
export const metadata = { title: "Личный кабинет", robots: { index: false, follow: false } };
export default function Page() { return <WhenReady><Suspense><AccountView /></Suspense></WhenReady>; }
