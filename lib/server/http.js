// Общие помощники для API-маршрутов.
import { NextResponse } from "next/server";
import { isAdmin } from "./auth.js";

export const json = (data, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export const bad = (error, status = 400) => json({ error }, status);
export async function body(req) { try { return await req.json(); } catch { return {}; } }
export async function adminOnly() { return (await isAdmin()) ? null : bad("Нужен вход в админку", 401); }
// Ошибки сервера не показываем покупателю подробно, но пишем в лог
export function wrap(fn) {
  return async (...a) => {
    try { return await fn(...a); }
    catch (e) { console.error(e); return bad("Что-то пошло не так. Попробуйте ещё раз через минуту.", 500); }
  };
}
