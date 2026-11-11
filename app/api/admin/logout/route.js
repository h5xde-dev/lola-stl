import { json } from "@/lib/server/http";
import { adminLogout } from "@/lib/server/auth";
export const dynamic = "force-dynamic";
export async function POST() { await adminLogout(); return json({ ok: true }); }
