// Каталог для серверных страниц (SSR, SEO, карта сайта): читается из базы.
import * as R from "./repo.js";

export async function getCategories() { return R.getCategories(); }
export async function getCategory(slug) { return (await R.getCategories()).find(c => c.slug === slug) || null; }
export async function getModels() { return R.getPublicModels(); }
export async function getModel(slug) { return (await R.getPublicModels()).find(m => m.slug === slug) || null; }
export async function getPrices() { return (await R.getSettings()).prices; }
