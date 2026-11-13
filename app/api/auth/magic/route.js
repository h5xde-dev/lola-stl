import { NextResponse } from "next/server";
import { setCustomer, verify } from "@/lib/server/auth";
import { useLoginToken } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
// Ссылка из письма: одноразовая, после входа ставит куку сессии и открывает «Мои покупки».
export async function GET(req) {
  const url = new URL(req.url);
  const t = verify(url.searchParams.get("t"));
  const used = t?.n ? await useLoginToken(t.n) : null;
  if (!used) return NextResponse.redirect(new URL("/account?link=expired", url));
  await setCustomer(used.customer_id);
  return NextResponse.redirect(new URL("/account?welcome=1", url));
}
