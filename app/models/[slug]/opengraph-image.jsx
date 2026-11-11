import { OG_SIZE, ogImage } from "@/lib/og";
import { getModel } from "@/lib/models";
import { DEFAULT_PRICES, boxPrice, paidPrice } from "@/lib/pricing";
import { rub } from "@/lib/format";

export const alt = "STL-модель lola.stl";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }) {
  const { slug } = await params;
  const m = await getModel(slug);
  if (!m) return ogImage({ title: "lola.stl", sub: "STL-модели для 3D-печати", chip: "Каталог" });
  const price = m.cat === "box" ? boxPrice(DEFAULT_PRICES, 1, false) : paidPrice(DEFAULT_PRICES, 1);
  return ogImage({ title: m.name, sub: `STL-модель ${m.cat === "box" ? "бокса" : "кашпо"}${m.dims ? " · " + m.dims.replace(/ /g, "\u00a0") : ""}`, chip: rub(price).replace(" ", " "), m });
}
