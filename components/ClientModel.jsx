"use client";
import Link from "next/link";
import ModelView from "./ModelView";
import { useStore } from "./Store";

export default function ClientModel({ slug }) {
  const { s, ready } = useStore();
  const m = s.models.find(x => x.slug === slug && !x.deleted);
  if (!ready) return <div className="inner-page"><div className="skeleton">Загрузка…</div></div>;
  if (!m) return <div className="inner-page"><h1>Модель не найдена</h1><div className="empty">Возможно, её убрали из каталога. <Link href="/">Перейти в каталог</Link></div></div>;
  return <ModelView initial={m} />;
}
