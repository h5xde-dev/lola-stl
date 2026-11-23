"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

// Уведомление о cookie. Сайт ставит только технические cookie (вход в кабинет, доступ к заказам),
// поэтому отказ не предлагается — достаточно сообщить и дать ссылку на политику.
const KEY = "lola-cookie-ok";

export default function CookieNote() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem(KEY)) setShow(true); } catch { setShow(true); }
  }, []);
  if (!show) return null;
  const ok = () => { try { localStorage.setItem(KEY, "1"); } catch {} setShow(false); };
  return (
    <div className="cookie-note site-only" data-nosnippet role="region" aria-label="Уведомление о cookie">
      <p>Сайт использует только технические cookie — без них не работают личный кабинет и доступ к купленным файлам. Аналитики и рекламы нет. <Link href="/privacy">Подробнее</Link></p>
      <button type="button" className="button button-dark" onClick={ok}>Понятно</button>
    </div>
  );
}
