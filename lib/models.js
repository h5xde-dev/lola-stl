// Каталог моделей. Сейчас это файл в репозитории; в рабочей версии те же функции
// будут читать базу данных, страницы при этом менять не придётся.

const MODELS = [
  { id: "m01", slug: "tvist-6", name: "Твист-6", cat: "plant", n: 6, twist: 1.3, prof: "cone", color: "#e7a3b3", h: .62, r: .25, mb: 86, dims: "120 × 120 × 118 мм", print: "режим вазы, сопло 0,6 мм", vase: true, isNew: true, desc: "Шестигранное кашпо с закруткой на треть оборота. Печатается одной стенкой, без поддержек." },
  { id: "m02", slug: "volna", name: "Волна", cat: "plant", n: 18, round: true, prof: "wave", color: "#8fb8de", h: .6, r: .26, mb: 64, dims: "110 × 110 × 120 мм", print: "сопло 0,4 мм, слой 0,2 мм", desc: "Мягкий волнистый профиль с тонкими рёбрами. Подходит для суккулентов." },
  { id: "m03", slug: "soty", name: "Соты", cat: "plant", n: 6, twist: 0, phase: .5, prof: "cyl", color: "#d9b54a", h: .55, r: .27, mb: 142, dims: "130 × 115 × 105 мм", print: "сопло 0,4 мм, слой 0,2 мм", desc: "Ровный шестигранник с текстурой сот по стенке. Хорошо собирается в группу." },
  { id: "m04", slug: "kaplya", name: "Капля", cat: "plant", n: 0, round: true, prof: "bulb", color: "#b8a6e8", h: .64, r: .24, mb: 38, dims: "100 × 100 × 125 мм", print: "режим вазы, сопло 0,6 мм", vase: true, desc: "Округлое кашпо с сужением к верху. Минимум деталей, быстро печатается." },
  { id: "m05", slug: "yarus", name: "Ярус", cat: "plant", n: 8, twist: .4, prof: "hour", color: "#4f9e9a", h: .6, r: .27, mb: 118, dims: "125 × 125 × 120 мм", print: "сопло 0,4 мм, слой 0,16 мм", desc: "Восьмигранник с талией и лёгкой закруткой." },
  { id: "m06", slug: "rebro", name: "Ребро", cat: "plant", n: 16, round: true, prof: "cone", color: "#ebe5db", h: .6, r: .26, mb: 54, dims: "115 × 115 × 115 мм", print: "сопло 0,4 мм, слой 0,2 мм", desc: "Конус с вертикальными рёбрами. Смотрится как керамика." },
  { id: "m07", slug: "lotos", name: "Лотос", cat: "plant", n: 10, twist: .9, prof: "bowl", color: "#b8417f", h: .48, r: .3, mb: 196, dims: "160 × 160 × 95 мм", print: "сопло 0,4 мм, слой 0,2 мм", isNew: true, desc: "Широкая низкая чаша с лепестковыми гранями. Для композиций и мха." },
  { id: "m08", slug: "prizma", name: "Призма", cat: "plant", n: 3, twist: 2.1, prof: "cyl", color: "#3b4048", h: .6, r: .26, mb: 72, dims: "120 × 110 × 120 мм", print: "режим вазы, сопло 0,6 мм", vase: true, desc: "Треугольник, закрученный на 120°. Хорошо смотрится в тёмном пластике." },
  { id: "m09", slug: "pesochnye-chasy", name: "Песочные часы", cat: "plant", n: 0, round: true, prof: "hour", color: "#a7c49a", h: .62, r: .25, mb: 47, dims: "110 × 110 × 125 мм", print: "режим вазы, сопло 0,6 мм", vase: true, desc: "Круглое кашпо с талией посередине." },
  { id: "m10", slug: "kora", name: "Кора", cat: "plant", n: 12, twist: .25, prof: "bulb", color: "#9c7b5b", h: .64, r: .26, mb: 233, dims: "140 × 140 × 150 мм", print: "сопло 0,4 мм, слой 0,12 мм", desc: "Фактура древесной коры. Детализированная модель, поэтому файл крупный." },
  { id: "m11", slug: "spiral-8", name: "Спираль-8", cat: "plant", n: 8, twist: 3.2, prof: "cone", color: "#f0c8d4", h: .62, r: .25, mb: 104, dims: "120 × 120 × 125 мм", print: "режим вазы, сопло 0,6 мм", vase: true, isNew: true, desc: "Восемь граней с полным оборотом спирали." },
  { id: "m12", slug: "minimal", name: "Минимал", cat: "plant", n: 0, round: true, prof: "cyl", color: "#c9d3dc", h: .5, r: .25, mb: 12, dims: "100 × 100 × 100 мм", print: "режим вазы, сопло 0,4 мм", vase: true, desc: "Простой цилиндр с поддоном. Основа для любых интерьеров." },
  { id: "m13", slug: "gofre", name: "Гофре", cat: "plant", n: 24, round: true, prof: "wave", color: "#e2b07a", h: .58, r: .27, mb: 88, dims: "130 × 130 × 115 мм", print: "сопло 0,4 мм, слой 0,2 мм", desc: "Частые рёбра и волна по высоте." },
  { id: "m14", slug: "buton", name: "Бутон", cat: "plant", n: 5, twist: 1, prof: "bulb", color: "#c56a8a", h: .62, r: .25, mb: 61, dims: "115 × 115 × 125 мм", print: "режим вазы, сопло 0,6 мм", vase: true, desc: "Пятигранник, собранный к горлышку, как нераскрывшийся цветок." },
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
