// Адрес сайта и разрешение на индексацию задаются переменными окружения в Vercel.
// Пока INDEXING не равно "on", поисковикам отдаётся запрет: на сайте ещё заглушки реквизитов.
const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL : null;
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || fromVercel || "http://localhost:3000").replace(/\/$/, "");
export const INDEXING = process.env.INDEXING === "on";
export const SITE_NAME = "lola.stl";
export const SITE_DESC = "Авторские STL-модели кашпо и лотков для рассады для 3D-печати. Отпечатки можно продавать. Файлы сразу после оплаты, без регистрации.";
