"use client";
// Связка с Telegram Mini App.
// Telegram открывает сайт с подписанными данными пользователя в адресе (#tgWebAppData=…).
// Тогда: подключаем официальный скрипт Telegram, разворачиваем мини-приложение на весь экран,
// красим шапку Telegram в цвет сайта, показываем системную кнопку «Назад» и входим по подписи.
// В обычном браузере ничего не делает.

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, useStore } from "./Store";

const SCRIPT = "https://telegram.org/js/telegram-web-app.js";
const BG = "#090713";

function inTelegram() {
  try {
    if (new URLSearchParams(location.hash.slice(1)).get("tgWebAppData")) { sessionStorage.setItem("lola-tg", "1"); return true; }
    return sessionStorage.getItem("lola-tg") === "1";
  } catch { return false; }
}

export default function TelegramBridge() {
  const { set, loadMe, ready } = useStore();
  const path = usePathname(), router = useRouter();
  const wa = useRef(null);
  const hashData = useRef("");

  useEffect(() => {
    if (!inTelegram()) return;
    hashData.current = new URLSearchParams(location.hash.slice(1)).get("tgWebAppData") || "";
    document.documentElement.classList.add("tg-real");
    const start = () => {
      const w = window.Telegram?.WebApp;
      if (!w) return;
      wa.current = w;
      w.ready();
      w.expand();
      try { w.setHeaderColor(BG); w.setBackgroundColor(BG); w.setBottomBarColor?.(BG); } catch {}
      try { w.disableVerticalSwipes?.(); } catch {}
      w.BackButton.onClick(() => (history.length > 1 ? router.back() : router.push("/")));
      if (location.pathname !== "/") w.BackButton.show();
      const initData = w.initData || hashData.current;
      if (initData) api("/api/tg/auth", { method: "POST", body: JSON.stringify({ initData }) }).then(r => { if (r.ok) loadMe(); });
    };
    if (window.Telegram?.WebApp) start();
    else {
      const sc = document.createElement("script");
      sc.src = SCRIPT; sc.async = true; sc.onload = start;
      document.head.appendChild(sc);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Вид мини-приложения включаем после того, как хранилище прочитало сохранённые настройки браузера,
  // иначе сохранённый вид «сайт» перезапишет его
  useEffect(() => { if (ready && inTelegram()) set({ mode: "tg" }); }, [ready, set]);

  // Системная кнопка «Назад» Telegram — на всех страницах, кроме главной
  useEffect(() => {
    const w = wa.current;
    if (!w) return;
    if (path === "/") w.BackButton.hide(); else w.BackButton.show();
  }, [path]);

  return null;
}
