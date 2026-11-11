import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import ModelArt from "@/components/ModelArt";

export const OG_SIZE = { width: 1200, height: 630 };

// Картинка для соцсетей рисуется ~0,3 с процессора, а запрашивают её Telegram, VK и поисковики
// при каждом показе ссылки. Готовые PNG и шрифты держим в памяти; браузерам и кешам — сутки.
const g = globalThis;
const pngCache = g.__lolaOg || (g.__lolaOg = new Map());
const fontCache = g.__lolaOgFonts || (g.__lolaOgFonts = new Map());
const PNG_MAX = 60;

// Шрифт с кириллицей берётся из Google Fonts только для нужных символов.
// Если сеть недоступна, картинка всё равно соберётся со шрифтом по умолчанию.
function font(family, weight, text) {
  const key = `${family}:${weight}:${text}`;
  if (!fontCache.has(key)) fontCache.set(key, loadFont(family, weight, text).then(f => { if (!f) fontCache.delete(key); return f; }));
  return fontCache.get(key);
}
async function loadFont(family, weight, text) {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch { return null; }
}

// Фото модели из public/ как data URL; если файла нет, рисуется схема.
async function photoData(m) {
  const src = m?.photos?.[0];
  if (!src || !src.startsWith("/")) return null;
  try { return "data:image/jpeg;base64," + (await readFile(join(process.cwd(), "public", src))).toString("base64"); }
  catch { return null; }
}

const HEADERS = { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" };

export async function ogImage(args) {
  const key = JSON.stringify([args.title, args.sub, args.chip, args.m?.photos?.[0] || args.m?.id || "", args.m?.color || ""]);
  let png = pngCache.get(key);
  if (!png) {
    png = await (await renderOg(args)).arrayBuffer();
    if (pngCache.size >= PNG_MAX) pngCache.delete(pngCache.keys().next().value);
    pngCache.set(key, png);
  }
  return new Response(png, { headers: HEADERS });
}

async function renderOg({ title, sub, chip, m }) {
  const photo = await photoData(m);
  const text = "lola.stl" + title + sub + chip;
  const [disp, body] = await Promise.all([font("Unbounded", 700, text), font("Manrope", 600, text)]);
  const fonts = [disp && { name: "Unbounded", data: disp, weight: 700 }, body && { name: "Manrope", data: body, weight: 600 }].filter(Boolean);
  const grid = "linear-gradient(rgba(255,54,207,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,54,207,.09) 1px, transparent 1px)";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#090713", fontFamily: "Manrope", color: "#f6edff" }}>
        <div style={{ width: 600, height: 630, display: "flex", alignItems: "center", justifyContent: "center", background: "#171125", backgroundImage: grid, backgroundSize: "36px 36px" }}>
          {photo ? <img src={photo} alt="" width={600} height={630} style={{ width: 600, height: 630, objectFit: "cover" }} />
            : m ? <div style={{ width: 540, height: 540, display: "flex" }}><ModelArt m={m} uid="og" photo={false} size={540} /></div>
            : <div style={{ fontFamily: "Unbounded", fontSize: 96, display: "flex" }}>lola<span style={{ color: "#ff36cf" }}>.stl</span></div>}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 56px 56px 48px" }}>
          <div style={{ fontFamily: "Unbounded", fontSize: 34, display: "flex" }}>lola<span style={{ color: "#ff36cf" }}>.stl</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontFamily: "Unbounded", fontSize: title.length > 18 ? 48 : 64, lineHeight: 1.05, letterSpacing: -1 }}>{title}</div>
            <div style={{ fontSize: 28, color: "#b7a9c8", lineHeight: 1.3 }}>{sub}</div>
          </div>
          <div style={{ display: "flex" }}>
            <div style={{ background: "#ff36cf", color: "#100817", borderRadius: 3, padding: "12px 26px", fontSize: 28 }}>{chip}</div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  );
}
