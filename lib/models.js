// Каталог моделей. Сейчас это файл в репозитории; в рабочей версии те же функции
// будут читать базу данных, страницы при этом менять не придётся.

const MODELS = [
  // Реальные модели с фото. Размер файла, габариты и настройки печати — уточнить у владелицы.
  { id: "p01", slug: "glubina", name: "Глубина", cat: "plant", kind: "Кашпо", n: 9, twist: .6, prof: "bulb", color: "#8e3fd0", h: .6, r: .27, mb: 184, dims: "", print: "", isNew: true, photos: ["/images/works/glubina.jpg"], desc: "Скульптурное кашпо с выразительными щупальцами и рельефом. Красиво смотрится в пластике с переливом: бирюза, маджента, ночной фиолетовый." },
  { id: "p02", slug: "puzyri", name: "Пузыри", cat: "plant", kind: "Кашпо", n: 24, round: true, prof: "cyl", color: "#8fa6ff", h: .55, r: .27, mb: 142, dims: "", print: "", photos: ["/images/works/puzyri.jpg"], desc: "Цилиндрическое кашпо с объёмной пузырьковой текстурой. В шёлковом пластике с переливом рельеф играет разными цветами." },
  { id: "p03", slug: "grani", name: "Грани", cat: "plant", kind: "Кашпо", n: 14, twist: .3, prof: "cyl", color: "#9b30ff", h: .64, r: .23, mb: 96, dims: "", print: "", photos: ["/images/works/grani.jpg"], desc: "Высокое кашпо с гранёной поверхностью, как у кристалла. Блики на гранях хорошо видны в однотонном шёлковом пластике." },
  { id: "p04", slug: "korall", name: "Коралл", cat: "plant", kind: "Кашпо", n: 18, round: true, prof: "hour", color: "#b07cff", h: .55, r: .27, mb: 210, dims: "", print: "", photos: ["/images/works/korall.jpg"], desc: "Кашпо с волнистым коралловым рельефом. Узор непрерывно обходит стенку по кругу." },
  { id: "p05", slug: "romashki", name: "Ромашки", cat: "plant", kind: "Кашпо", n: 9, round: true, prof: "cone", color: "#ff2f8f", h: .6, r: .25, mb: 168, dims: "", print: "", isNew: true, photos: ["/images/works/romashki.jpg"], desc: "Кашпо, покрытое рельефными ромашками. Особенно эффектно в трёхцветном шёлковом пластике." },
  { id: "p06", slug: "lotok-leopard", name: "Лоток «Леопард»", cat: "plant", kind: "Лоток для рассады", n: 4, twist: 0, phase: Math.PI / 4, prof: "cyl", color: "#f2a58c", h: .36, r: .33, mb: 236, dims: "", print: "", photos: ["/images/works/rassada-leopard.jpg"], desc: "Лоток для рассады на 8 горшков с леопардовой фактурой по бокам и кармашком для полива." },
  { id: "p07", slug: "lotok-kapli", name: "Лоток «Капли»", cat: "plant", kind: "Лоток для рассады", n: 4, twist: 0, phase: Math.PI / 4, prof: "cyl", color: "#a99bff", h: .36, r: .33, mb: 188, dims: "", print: "", photos: ["/images/works/rassada-9.jpg"], desc: "Квадратный лоток на 9 горшков с точечной фактурой и кармашком для полива." },
  { id: "b01", slug: "romb", name: "Ромб", cat: "box", n: 4, twist: 0, phase: Math.PI / 4, prof: "cyl", color: "#b8a6e8", h: .42, r: .3, mb: 26, dims: "140 × 140 × 90 мм", print: "сопло 0,4 мм, слой 0,2 мм", desc: "Квадратный бокс с крышкой на посадке." },
  { id: "b02", slug: "pletenka", name: "Плетёнка", cat: "box", n: 4, twist: 0, phase: .35, prof: "cyl", color: "#e7c9a0", h: .44, r: .31, mb: 158, dims: "160 × 120 × 95 мм", print: "сопло 0,4 мм, слой 0,16 мм", isNew: true, desc: "Бокс с фактурой плетёной корзины." },
  { id: "b03", slug: "kupol", name: "Купол", cat: "box", n: 0, round: true, prof: "bulb", color: "#8fb8de", h: .45, r: .29, mb: 44, dims: "130 × 130 × 100 мм", print: "сопло 0,4 мм, слой 0,2 мм", desc: "Круглая шкатулка с куполообразной крышкой." },
  { id: "b04", slug: "shestigrannik", name: "Шестигранник", cat: "box", n: 6, twist: 0, phase: 0, prof: "cyl", color: "#4f9e9a", h: .4, r: .3, mb: 33, dims: "140 × 125 × 80 мм", print: "сопло 0,4 мм, слой 0,2 мм", desc: "Шестигранный бокс для мелочей." },
];

// Дата добавления в каталог (для sitemap). Пока одна на все модели.
const UPDATED = "2026-11-10";

export const BASE_MODELS = MODELS.map(m => ({ ...m, updated: UPDATED }));

export async function getModels() {
  return BASE_MODELS.filter(m => !m.hidden && !m.deleted);
}

export async function getModel(slug) {
  return BASE_MODELS.find(m => m.slug === slug && !m.hidden && !m.deleted) || null;
}

export const catName = c => (c === "box" ? "Бокс" : "Кашпо");
// Подпись типа для конкретной модели: лоток, кашпо, бокс.
export const kindName = m => m.kind || catName(m.cat);
const GEN = { "Кашпо": "кашпо", "Бокс": "бокса", "Лоток для рассады": "лотка для рассады" };
// «STL-модель кашпо», «STL-модель лотка для рассады»
export const kindGen = m => GEN[kindName(m)] || kindName(m).toLowerCase();

// Похожие: сначала та же категория и силуэт, потом та же категория.
export function related(all, m, count = 4) {
  const score = x => (x.cat === m.cat ? 2 : 0) + (x.prof === m.prof ? 1 : 0) + (!!x.vase === !!m.vase ? .5 : 0);
  return all.filter(x => x.id !== m.id && !x.hidden && !x.deleted).sort((a, b) => score(b) - score(a)).slice(0, count);
}

const TR = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
export const slugify = s => String(s).toLowerCase().split("").map(c => TR[c] ?? c).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "model";

// Модели из админки прототипа есть только в браузере, сервер о них не знает.
// Метка ?local=1 говорит странице показать их из браузера, а не отвечать 404.
export const modelHref = m => `/models/${m.slug}${m.custom ? "?local=1" : ""}`;
