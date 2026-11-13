// Настройки содержимого, которые владелица меняет в админке: главная, SEO, реквизиты.
// Здесь — значения по умолчанию; сохранённые в базе поля поверх них.

import { SITE_DESC } from "./site.js";

const w = f => `/images/works/${f}.jpg`;

export const DEFAULT_HOME = {
  kicker: "STL-модели для 3D-печати",
  title: "Кашпо, которых",
  titleEm: "нет у других",
  text: "Авторские модели для тех, кто печатает на продажу или для души. Отпечатки можно продавать. Файлы приходят сразу после оплаты, регистрация не нужна.",
  note: "Каждая модель проверена печатью",
  noteSmall: "Около 130 моделей, каталог пополняется",
  hero: [
    { src: w("glubina"), alt: "Напечатанное кашпо «Глубина» с щупальцами в бирюзово-розовом шёлковом пластике" },
    { src: w("romashki"), alt: "Кашпо с рельефными ромашками" },
    { src: w("grani"), alt: "Гранёное фиолетовое кашпо" },
  ],
  galleryTitle: "Так модели выглядят после печати",
  gallery: [
    { src: w("puzyri"), href: "/models/puzyri", size: "tall", tag: "Пара кашпо", text: "Пузырьковая текстура", alt: "Два кашпо с пузырьковой текстурой в сине-фиолетовом пластике" },
    { src: w("rassada-9"), href: "/models/lotok-kapli", size: "wide", tag: "Лоток", text: "Для рассады на 9 горшков", alt: "Лоток для рассады на девять горшков с точечной текстурой" },
    { src: w("grani"), href: "/models/grani", size: "tall", tag: "Кашпо", text: "Гранёная поверхность", alt: "Фиолетовое кашпо с гранёной поверхностью" },
    { src: w("korall"), href: "/models/korall", size: "", tag: "Пара кашпо", text: "Коралловый рельеф", alt: "Два кашпо с волнистым коралловым рельефом" },
    { src: w("romashki"), href: "/models/romashki", size: "", tag: "Шёлковый PLA", text: "Кашпо с ромашками", alt: "Кашпо с рельефными ромашками в трёхцветном шёлковом пластике" },
  ],
  editorial: { src: w("rassada-leopard"), alt: "Ящик для рассады с леопардовой текстурой под фитолампой" },
};

export const DEFAULT_SEO = {
  title: "lola.stl — авторские STL-модели кашпо для 3D-печати",
  description: SITE_DESC,
  keywords: "STL-модели, 3D-печать, кашпо, модели для 3D-принтера, купить STL, лоток для рассады",
  blogTitle: "Статьи о 3D-печати кашпо",
  blogDescription: "Советы по печати кашпо и лотков: пластик, настройки слайсера, режим вазы, уход за отпечатками.",
  ogImage: "",
  google: "",
  yandex: "",
  sameAs: "",
};

export const DEFAULT_COMPANY = { name: "", inn: "", ogrn: "", email: "", phone: "" };

// Сохранённое поверх значений по умолчанию; пустые строки в списках картинок не затирают картинку
export function mergeHome(saved) {
  const s = saved || {};
  return {
    ...DEFAULT_HOME, ...s,
    hero: DEFAULT_HOME.hero.map((d, i) => ({ ...d, ...(s.hero?.[i] || {}), src: s.hero?.[i]?.src || d.src })),
    gallery: Array.isArray(s.gallery) ? s.gallery.filter(g => g?.src) : DEFAULT_HOME.gallery,
    editorial: { ...DEFAULT_HOME.editorial, ...(s.editorial || {}), src: s.editorial?.src || DEFAULT_HOME.editorial.src },
  };
}
export const mergeSeo = saved => ({ ...DEFAULT_SEO, ...Object.fromEntries(Object.entries(saved || {}).filter(([, v]) => v !== "" && v != null)) });
export const mergeCompany = saved => ({ ...DEFAULT_COMPANY, ...(saved || {}) });

// Строка реквизитов для подвала и чека
export function companyLine(c) {
  return [c.name || "ИП [ФИО]", c.inn ? "ИНН " + c.inn : "ИНН [—]", c.ogrn ? "ОГРНИП " + c.ogrn : ""].filter(Boolean).join(" · ");
}
