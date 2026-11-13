// Каталог для серверных страниц (SSR, SEO, карта сайта): читается из базы.
import * as R from "./repo.js";

export async function getCategories() { return R.getCategories(); }
export async function getCategory(slug) { return (await R.getCategories()).find(c => c.slug === slug) || null; }
export async function getModels() { return R.getPublicModels(); }
export async function getModel(slug) { return (await R.getPublicModels()).find(m => m.slug === slug) || null; }
export async function getPrices() { return (await R.getSettings()).prices; }

// Содержимое из админки: главная, SEO, реквизиты, статьи
import { mergeCompany, mergeHome, mergeSeo } from "../content.js";
export async function getHome() { return mergeHome((await R.getSettings()).home); }
export async function getSeo() { return mergeSeo((await R.getSettings()).seo); }
export async function getCompany() { return mergeCompany((await R.getSettings()).company); }
export async function getArticles() { return (await R.getArticles()).filter(a => a.published).sort((a, b) => String(b.date).localeCompare(String(a.date))); }
export async function getArticle(slug) { return (await getArticles()).find(a => a.slug === slug) || null; }
