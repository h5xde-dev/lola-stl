import { body, json, wrap } from "@/lib/server/http";
import { getCustomerId } from "@/lib/server/auth";
import { quoteFor } from "@/lib/server/shop";

export const dynamic = "force-dynamic";
// Цена корзины с учётом промокода, наборов и истории покупателя — считает сервер.
export const POST = wrap(async req => {
  const { cart, code } = await body(req);
  return json(await quoteFor({ cart, code, customerId: await getCustomerId() }));
});
