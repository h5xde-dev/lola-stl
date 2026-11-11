import { AdminEditor } from "@/components/Admin";
export const metadata = { title: "Модель" };
export default async function Page({ params }) { const { id } = await params; return <AdminEditor key={id} id={id} />; }
