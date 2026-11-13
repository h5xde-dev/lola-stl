import { revalidatePath } from "next/cache";
import { adminOnly, json, wrap } from "@/lib/server/http";
import { deleteTestOrders, invalidate } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
// Удалить все тестовые заказы (оформленные тестовой оплатой) и журнал их скачиваний
export const DELETE = wrap(async () => {
  const deny = await adminOnly(); if (deny) return deny;
  const n = await deleteTestOrders();
  invalidate(); revalidatePath("/", "layout");
  return json({ deleted: n });
});
