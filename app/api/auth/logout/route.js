import { json } from "@/lib/server/http";
import { logout } from "@/lib/server/auth";
export const dynamic = "force-dynamic";
export async function POST() { await logout(); return json({ ok: true }); }
