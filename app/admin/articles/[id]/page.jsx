import { AdminArticleEditor } from "@/components/AdminContent";
export const metadata = { title: "Статья" };
export default async function Page({ params }) { const { id } = await params; return <AdminArticleEditor key={id} id={id} />; }
