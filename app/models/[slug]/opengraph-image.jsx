import { OG_SIZE, ogImage } from "@/lib/og";
import { kindGen } from "@/lib/models";
import { getCategories, getModel } from "@/lib/server/catalog";
import { getPrices } from "@/lib/server/catalog";
import { boxPrice, paidPrice } from "@/lib/pricing";
import { rub } from "@/lib/format";

export const alt = "STL-модель lola.stl";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }) {
  const { slug } = await params;
  const m = await getModel(slug);
  if (!m) return ogImage({ title: "lola.stl", sub: "STL-модели для 3D-печати", chip: "Каталог" });
  const prices = await getPrices();
  const price = m.cat === "box" ? boxPrice(prices, 1, false) : paidPrice(prices, 1);
  return ogImage({ title: m.name, sub: `STL-модель ${kindGen(m, await getCategories())}${m.dims ? " · " + m.dims.replace(/ /g, "\u00a0") : ""}`, chip: rub(price).replace(" ", " "), m });
}
