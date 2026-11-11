import { OG_SIZE, ogImage } from "@/lib/og";
import { getCategory, getModels } from "@/lib/models";
import { models } from "@/lib/format";

export const alt = "Категория STL-моделей lola.stl";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }) {
  const { slug } = await params;
  const c = await getCategory(slug);
  if (!c) return ogImage({ title: "lola.stl", sub: "STL-модели для 3D-печати", chip: "Каталог" });
  const list = (await getModels()).filter(m => m.category === c.id);
  return ogImage({ title: c.name, sub: "Авторские STL-модели для 3D-печати", chip: list.length ? models(list.length) : "Скоро", m: list[0] });
}
