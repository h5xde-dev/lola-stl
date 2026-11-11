import { OG_SIZE, ogImage } from "@/lib/og";
import { BASE_MODELS } from "@/lib/models";

export const alt = "lola.stl — авторские STL-модели кашпо для 3D-печати";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return ogImage({ title: "STL-модели кашпо", sub: "Авторские модели для 3D-печати. Отпечатки можно продавать.", chip: "2 модели + 1 в подарок", m: BASE_MODELS.find(m => m.id === "m07") });
}
