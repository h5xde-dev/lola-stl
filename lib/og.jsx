import { ImageResponse } from "next/og";
import ModelArt from "@/components/ModelArt";

export const OG_SIZE = { width: 1200, height: 630 };

// Шрифт с кириллицей берётся из Google Fonts только для нужных символов.
// Если сеть недоступна, картинка всё равно соберётся со шрифтом по умолчанию.
async function font(family, weight, text) {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch { return null; }
}

export async function ogImage({ title, sub, chip, m }) {
  const text = "lola.stl" + title + sub + chip;
  const [disp, body] = await Promise.all([font("Unbounded", 700, text), font("Manrope", 600, text)]);
  const fonts = [disp && { name: "Unbounded", data: disp, weight: 700 }, body && { name: "Manrope", data: body, weight: 600 }].filter(Boolean);
  const grid = "linear-gradient(rgba(201,48,118,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(201,48,118,.10) 1px, transparent 1px)";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#fdf7f9", fontFamily: "Manrope", color: "#2b1a2c" }}>
        <div style={{ width: 600, height: 630, display: "flex", alignItems: "center", justifyContent: "center", background: "#f7eaf0", backgroundImage: grid, backgroundSize: "36px 36px" }}>
          {m ? <div style={{ width: 540, height: 540, display: "flex" }}><ModelArt m={m} uid="og" photo={false} size={540} /></div>
            : <div style={{ fontFamily: "Unbounded", fontSize: 96, display: "flex" }}>lola<span style={{ color: "#c93076" }}>.stl</span></div>}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 56px 56px 48px" }}>
          <div style={{ fontFamily: "Unbounded", fontSize: 34, display: "flex" }}>lola<span style={{ color: "#c93076" }}>.stl</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontFamily: "Unbounded", fontSize: title.length > 18 ? 48 : 64, lineHeight: 1.05, letterSpacing: -1 }}>{title}</div>
            <div style={{ fontSize: 28, color: "#7d6a7c", lineHeight: 1.3 }}>{sub}</div>
          </div>
          <div style={{ display: "flex" }}>
            <div style={{ background: "#c93076", color: "#fff", borderRadius: 999, padding: "12px 26px", fontSize: 28 }}>{chip}</div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  );
}
