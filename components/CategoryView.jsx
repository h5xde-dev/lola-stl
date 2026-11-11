"use client";
import Link from "next/link";
import Catalog from "./Catalog";
import { useStore } from "./Store";

// Страница категории: заголовок, описание и каталог только этой категории.
// Данные с сервера; если категорию поменяли в админке прототипа, покажется изменённая версия.
export default function CategoryView({ slug, initial }) {
  const { cats, ready } = useStore();
  const c = cats.find(x => x.slug === slug) || initial;
  if (!c) {
    if (!ready) return <div className="inner-page"><div className="skeleton">Загрузка…</div></div>;
    return <div className="inner-page"><div className="page-title"><h1>Категория не найдена</h1></div><div className="empty-state">Возможно, её убрали. <Link href="/">Перейти в каталог</Link></div></div>;
  }
  return (
    <div className="inner-page">
      <nav className="breadcrumbs" aria-label="Навигация"><Link href="/">Каталог</Link><span aria-hidden="true">/</span><span aria-current="page">{c.name}</span></nav>
      <div className="page-title">
        <span className="eyebrow">STL-модели для 3D-печати</span>
        <h1>{c.name}</h1>
        {c.desc && <p style={{ maxWidth: 720 }}>{c.desc}</p>}
      </div>
      <Catalog category={c.id} />
    </div>
  );
}
