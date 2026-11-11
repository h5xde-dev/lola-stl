import { revalidatePath } from "next/cache";
import { verify } from "@/lib/server/auth";
import { invalidate } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
// Сброс кеша страниц после запуска сервера: страницы, собранные во время сборки образа,
// заменяются актуальными данными из базы. Вызывается из instrumentation.js с подписанным ключом.
export async function POST(req) {
  if (verify(req.headers.get("x-key"))?.purpose !== "revalidate") return new Response("forbidden", { status: 403 });
  invalidate();
  revalidatePath("/", "layout");
  return Response.json({ ok: true });
}
