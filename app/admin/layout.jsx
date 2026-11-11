import { WhenReady } from "@/components/Store";
import { AdminShell } from "@/components/Admin";
export const metadata = { title: { default: "Админка", template: "%s · админка | lola.stl" }, robots: { index: false, follow: false } };
export default function AdminLayout({ children }) { return <WhenReady><AdminShell>{children}</AdminShell></WhenReady>; }
