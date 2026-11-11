// Каталог: категории и модели. Сейчас это файл в репозитории; в рабочей версии
// те же функции будут читать базу данных, страницы при этом менять не придётся.
//
// Габариты, размер файла и настройки печати заполнены по фото и требуют сверки с исходными STL.

// Категория:
//   name    — во множественном числе, для меню и страницы категории («Лотки для рассады»)
//   single  — подпись на карточке одной модели («Лоток для рассады»)
//   gen     — для заголовков «STL-модель …» («лотка для рассады»)
//   pricing — «plant»: «Кашпо и другие модели» с подарками 2+1 и 1+1; «box»: цены боксов без подарков
//   desc    — текст страницы категории, попадает в поиск
export const BASE_CATEGORIES = [
  { id: "c-kashpo", slug: "kashpo", name: "Кашпо", single: "Кашпо", gen: "кашпо", pricing: "plant", inMenu: true, order: 1,
    desc: "Авторские STL-модели кашпо для 3D-печати: скульптурные, фактурные и гранёные формы. Печатаются без поддержек, хорошо смотрятся в шёлковом PLA с переливом. Отпечатки можно продавать." },
  { id: "c-lotki", slug: "lotki-dlya-rassady", name: "Лотки для рассады", single: "Лоток для рассады", gen: "лотка для рассады", pricing: "plant", inMenu: true, order: 2,
    desc: "STL-модели лотков для рассады под стандартные горшки: с ячейками, фактурными стенками и кармашком для полива. Удобны для подоконника и полки с фитолампой." },
  { id: "c-boksy", slug: "boksy", name: "Боксы", single: "Бокс", gen: "бокса", pricing: "box", inMenu: true, order: 3,
    desc: "STL-модели боксов и шкатулок с крышкой. Считаются по отдельным ценам, подарки «2+1» и «1+1» на них не действуют." },
];

const MODELS = [
  { id: "p01", slug: "glubina", name: "Глубина", category: "c-kashpo", isNew: true, photos: ["/images/works/glubina.jpg"],
    mb: 184, dims: "125 × 125 × 140 мм", print: "сопло 0,4 мм, слой 0,16 мм, без поддержек", material: "шёлковый PLA, лучше с переливом",
    tags: ["щупальца", "осьминог", "скульптурное кашпо"],
    desc: "Скульптурное кашпо, обвитое щупальцами с присосками. Рельеф глубокий, поэтому в пластике с переливом каждое щупальце играет своим цветом: бирюза, маджента, ночной фиолетовый. Подходит для суккулентов и небольших комнатных растений.",
    n: 9, twist: .6, prof: "bulb", color: "#8e3fd0", h: .6, r: .27 },
  { id: "p02", slug: "puzyri", name: "Пузыри", category: "c-kashpo", photos: ["/images/works/puzyri.jpg"],
    mb: 142, dims: "110 × 110 × 110 мм", print: "сопло 0,4 мм, слой 0,2 мм, без поддержек", material: "шёлковый PLA, двух- или трёхцветный",
    tags: ["пузырьковая текстура", "цилиндр"],
    desc: "Цилиндрическое кашпо с объёмной пузырьковой текстурой: ряды выпуклых капель расходятся волной по стенке. В многоцветном шёлковом пластике узор переливается при каждом повороте. Хорошо смотрится парой.",
    n: 24, round: true, prof: "cyl", color: "#8fa6ff", h: .55, r: .27 },
  { id: "p03", slug: "grani", name: "Грани", category: "c-kashpo", photos: ["/images/works/grani.jpg"],
    mb: 96, dims: "95 × 95 × 150 мм", print: "сопло 0,4 мм, слой 0,2 мм, без поддержек", material: "шёлковый PLA, однотонный",
    tags: ["гранёное кашпо", "кристалл"],
    desc: "Высокое кашпо с гранёной поверхностью, как у кристалла. Пирамидки по всей стенке ловят свет, поэтому блики особенно заметны в однотонном шёлковом пластике. Подойдёт и как ваза для сухоцветов.",
    n: 14, twist: .3, prof: "cyl", color: "#9b30ff", h: .64, r: .23 },
  { id: "p04", slug: "korall", name: "Коралл", category: "c-kashpo", photos: ["/images/works/korall.jpg"],
    mb: 210, dims: "110 × 110 × 120 мм", print: "сопло 0,4 мм, слой 0,16 мм, без поддержек", material: "шёлковый PLA, двухцветный",
    tags: ["коралловый рельеф", "органическая текстура"],
    desc: "Кашпо с волнистым коралловым рельефом: непрерывный узор обходит стенку по кругу без швов. Детализированная модель, поэтому файл крупный. В двухцветном пластике узор выглядит как перламутр.",
    n: 18, round: true, prof: "hour", color: "#b07cff", h: .55, r: .27 },
  { id: "p05", slug: "romashki", name: "Ромашки", category: "c-kashpo", isNew: true, photos: ["/images/works/romashki.jpg"],
    mb: 168, dims: "105 × 105 × 140 мм", print: "сопло 0,4 мм, слой 0,16 мм, без поддержек", material: "шёлковый PLA, трёхцветный",
    tags: ["цветочный рельеф", "ромашки"],
    desc: "Кашпо, сплошь покрытое рельефными ромашками. Лепестки печатаются чётко даже соплом 0,4 мм. Особенно эффектно в трёхцветном шёлковом пластике: золото, маджента и синий сменяют друг друга по кругу.",
    n: 9, round: true, prof: "cone", color: "#ff2f8f", h: .6, r: .25 },
  { id: "p06", slug: "lotok-leopard", name: "Лоток «Леопард»", category: "c-lotki", photos: ["/images/works/rassada-leopard.jpg"],
    mb: 236, dims: "240 × 125 × 85 мм, 8 ячеек", print: "сопло 0,4 мм, слой 0,2 мм, без поддержек", material: "PLA или PETG",
    tags: ["рассада", "лоток на 8 горшков", "леопардовая фактура"],
    desc: "Лоток для рассады на 8 горшков с леопардовой фактурой по бокам. Сбоку кармашек для полива: вода уходит в поддон, а не на подоконник. Ячейки под стандартные круглые горшки.",
    n: 4, twist: 0, phase: Math.PI / 4, prof: "cyl", color: "#f2a58c", h: .36, r: .33 },
  { id: "p07", slug: "lotok-kapli", name: "Лоток «Капли»", category: "c-lotki", photos: ["/images/works/rassada-9.jpg"],
    mb: 188, dims: "200 × 200 × 80 мм, 9 ячеек", print: "сопло 0,4 мм, слой 0,2 мм, без поддержек", material: "PLA или PETG",
    tags: ["рассада", "лоток на 9 горшков", "точечная фактура"],
    desc: "Квадратный лоток для рассады на 9 горшков с точечной фактурой «капли» и кармашком для полива. Помещается на стандартную полку под фитолампу.",
    n: 4, twist: 0, phase: Math.PI / 4, prof: "cyl", color: "#a99bff", h: .36, r: .33 },
];

// Дата добавления в каталог (для sitemap и schema.org).
const UPDATED = "2026-11-11";

const catById = Object.fromEntries(BASE_CATEGORIES.map(c => [c.id, c]));
// cat — ценовая группа, берётся из категории (её использует расчёт цены).
export const BASE_MODELS = MODELS.map(m => ({ ...m, cat: catById[m.category]?.pricing || "plant", updated: UPDATED }));

const live = m => !m.hidden && !m.deleted;

export async function getModels() { return BASE_MODELS.filter(live); }
export async function getModel(slug) { return BASE_MODELS.find(m => m.slug === slug && live(m)) || null; }
export async function getCategories() { return [...BASE_CATEGORIES].sort((a, b) => a.order - b.order); }
export async function getCategory(slug) { return BASE_CATEGORIES.find(c => c.slug === slug) || null; }

// Категория модели. cats — список категорий (из браузера в админке или серверный).
export const catOf = (m, cats = BASE_CATEGORIES) => cats.find(c => c.id === m.category) || cats.find(c => c.pricing === m.cat) || null;
// Подпись на карточке: «Кашпо», «Лоток для рассады», «Бокс».
export const kindName = (m, cats) => catOf(m, cats)?.single || (m.cat === "box" ? "Бокс" : "Кашпо");
// Для заголовков: «STL-модель кашпо», «STL-модель лотка для рассады».
export const kindGen = (m, cats) => catOf(m, cats)?.gen || kindName(m, cats).toLowerCase();

// Похожие: сначала та же категория, потом с общими метками.
export function related(all, m, count = 4) {
  const tags = new Set(m.tags || []);
  const score = x => (x.category === m.category ? 3 : 0) + (x.cat === m.cat ? 1 : 0) + (x.tags || []).filter(t => tags.has(t)).length;
  return all.filter(x => x.id !== m.id && live(x)).sort((a, b) => score(b) - score(a)).slice(0, count);
}

const TR = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
export const slugify = s => String(s).toLowerCase().split("").map(c => TR[c] ?? c).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "model";

// Адреса страниц модели и категории. Всё, что создано в админке, хранится в базе и имеет свою страницу.
export const modelHref = m => `/models/${m.slug}`;
export const categoryHref = c => `/category/${c.slug}`;
