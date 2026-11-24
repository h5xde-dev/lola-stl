import { NextResponse } from "next/server";
import { setCustomer, verify } from "@/lib/server/auth";
import { useLoginToken } from "@/lib/server/repo";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
// Ссылка из письма: одноразовая, после входа ставит куку сессии и открывает «Мои покупки».
// Перенаправляем на адрес сайта (SITE_URL), а не на адрес запроса: за прокси в Docker это 0.0.0.0:3000.
export async function GET(req) {
  const url = new URL(req.url);
  const t = verify(url.searchParams.get("t"));
  const used = t?.n ? await useLoginToken(t.n) : null;
  if (!used) return NextResponse.redirect(new URL("/account?link=expired", SITE_URL));
  await setCustomer(used.customer_id);
  return NextResponse.redirect(new URL("/account?welcome=1", SITE_URL));
}
