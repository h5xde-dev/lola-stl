// Вход без регистрации.
// — Покупатель: кука сессии ставится после ссылки из письма или входа через Telegram.
// — Тот, кто оплатил заказ в этом браузере, сразу видит этот заказ: id заказа лежит в подписанной куке.
// — Владелица: пароль ADMIN_PASSWORD, отдельная кука.
// Все куки подписаны HMAC (AUTH_SECRET) и недоступны скриптам страницы.

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { SITE_URL } from "../site.js";

const DEV = process.env.NODE_ENV !== "production";
// AUTH_SECRET обязателен в рабочем режиме. Пока его нет, секрет выводится из DATABASE_URL (он тоже секретный),
// а без базы — случайный на каждый запуск сервера: ссылки из писем тогда переживут не все перезапуски.
const SECRET = process.env.AUTH_SECRET
  || (DEV ? "dev-secret-change-me"
    : process.env.DATABASE_URL ? createHash("sha256").update("lola:" + process.env.DATABASE_URL).digest("base64url")
      : randomBytes(32).toString("base64url"));
if (!process.env.AUTH_SECRET && !DEV) console.error("AUTH_SECRET не задан — задайте его в настройках окружения");

const b64 = s => Buffer.from(s).toString("base64url");
const hmac = s => createHmac("sha256", SECRET).update(s).digest("base64url");

export function sign(payload) {
  const body = b64(JSON.stringify(payload));
  return body + "." + hmac(body);
}
export function verify(token) {
  if (!token || !SECRET) return null;
  const [body, sig] = String(token).split(".");
  if (!body || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(hmac(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    if (p.exp && Date.now() > p.exp) return null;
    return p;
  } catch { return null; }
}
export const nonce = () => randomBytes(16).toString("base64url");

// Пока сайт открыт по IP без HTTPS (SITE_URL на http://), браузер не сохранит куку с флагом Secure.
const SECURE = !DEV && SITE_URL.startsWith("https://");
const opts = maxAge => ({ httpOnly: true, sameSite: "lax", secure: SECURE, path: "/", maxAge });
const DAY = 86400;

// ---------- покупатель ----------
export async function getCustomerId() {
  return verify((await cookies()).get("lola_s")?.value)?.cid || null;
}
export async function setCustomer(cid) {
  (await cookies()).set("lola_s", sign({ cid, exp: Date.now() + 30 * DAY * 1000 }), opts(30 * DAY));
}
export async function logout() {
  const c = await cookies();
  c.delete("lola_s"); c.delete("lola_o");
}

// Заказы, оплаченные в этом браузере (без входа по ссылке)
export async function getOrderAccess() {
  return verify((await cookies()).get("lola_o")?.value)?.ids || [];
}
export async function addOrderAccess(id) {
  const ids = [...new Set([id, ...(await getOrderAccess())])].slice(0, 20);
  (await cookies()).set("lola_o", sign({ ids, exp: Date.now() + 30 * DAY * 1000 }), opts(30 * DAY));
}

// ---------- владелица ----------
export const adminPassword = () => process.env.ADMIN_PASSWORD || (DEV ? "lola" : "");
export async function isAdmin() {
  return !!verify((await cookies()).get("lola_a")?.value)?.admin;
}
export async function setAdmin() {
  (await cookies()).set("lola_a", sign({ admin: true, exp: Date.now() + 7 * DAY * 1000 }), opts(7 * DAY));
}
export async function adminLogout() {
  (await cookies()).delete("lola_a");
}

// ---------- Telegram Mini App ----------
// Подпись initData: secret = HMAC_SHA256("WebAppData", BOT_TOKEN), hash = HMAC_SHA256(secret, строка данных).
export function checkTelegram(initData, maxAgeSec = DAY) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !initData) return null;
  const p = new URLSearchParams(initData);
  const hash = p.get("hash");
  p.delete("hash");
  const data = [...p.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const calc = createHmac("sha256", secret).update(data).digest("hex");
  if (!hash || calc.length !== hash.length || !timingSafeEqual(Buffer.from(calc), Buffer.from(hash))) return null;
  if (Date.now() / 1000 - Number(p.get("auth_date") || 0) > maxAgeSec) return null;
  try { return JSON.parse(p.get("user") || "null"); } catch { return null; }
}

// Секрет вебхука бота: Telegram присылает его в заголовке каждого обновления
export const tgWebhookSecret = () => hmac("tg-webhook").slice(0, 48);

// ---------- адрес клиента ----------
export async function clientInfo() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || h.get("x-real-ip") || "").split(",")[0].trim() || "local";
  // «Сеть» — /24 для IPv4 и /48 для IPv6: разные устройства одной квартиры считаются одним местом
  const net = ip.includes(":") ? ip.split(":").slice(0, 3).join(":") : ip.split(".").slice(0, 3).join(".");
  return { ip, net, ua: (h.get("user-agent") || "").slice(0, 200) };
}
