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
  const [disp, body] = await Promise.all([font("PT+Serif", 400, text), font("Manrope", 600, text)]);
  const fonts = [disp && { name: "PT Serif", data: disp, weight: 400 }, body && { name: "Manrope", data: body, weight: 600 }].filter(Boolean);
  const grid = "linear-gradient(rgba(255,54,207,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,54,207,.09) 1px, transparent 1px)";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#090713", fontFamily: "Manrope", color: "#f6edff" }}>
        <div style={{ width: 600, height: 630, display: "flex", alignItems: "center", justifyContent: "center", background: "#171125", backgroundImage: grid, backgroundSize: "36px 36px" }}>
          {m ? <div style={{ width: 540, height: 540, display: "flex" }}><ModelArt m={m} uid="og" photo={false} size={540} /></div>
            : <div style={{ fontFamily: "PT Serif", fontSize: 96, display: "flex" }}>lola<span style={{ color: "#ff36cf" }}>.stl</span></div>}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 56px 56px 48px" }}>
          <div style={{ fontFamily: "PT Serif", fontSize: 34, display: "flex" }}>lola<span style={{ color: "#ff36cf" }}>.stl</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontFamily: "PT Serif", fontSize: title.length > 18 ? 48 : 64, lineHeight: 1.05, letterSpacing: -1 }}>{title}</div>
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
