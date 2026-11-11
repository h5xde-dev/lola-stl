"use client";
// Живой фон и анимации:
// — блоки и карточки плавно появляются при прокрутке;
// — за курсором по фону тянется мягкое свечение, по странице медленно плывут цветные пятна;
// — карточки и фото галереи слегка наклоняются под курсором, на них появляется блик.
// Без JS и при «уменьшении движения» всё просто видно сразу, без эффектов.

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const REVEAL = "[data-reveal], .product-card, .g-item, .benefit-row > div, .section-heading, .editorial, .detail-copy, .gallery";
const TILT = ".product-card, .g-item";

export default function Effects() {
  const path = usePathname();

  // Появление при прокрутке. Метка хранится в data-in: className карточек перезаписывает React.
  // Перезапускается при смене страницы и следит за новыми элементами.
  useEffect(() => {
    const root = document.documentElement;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      root.classList.remove("fx");
      return;
    }
    const io = new IntersectionObserver(entries => {
      let i = 0;
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.style.setProperty("--d", `${Math.min(i++, 6) * 70}ms`);
        e.target.dataset.in = "1";
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
    // То, что уже на экране, показывается сразу — анимируется только то, что ниже.
    const scan = (first) => document.querySelectorAll(REVEAL).forEach(el => {
      if (el.dataset.in || el.dataset.fxSeen) return;
      el.dataset.fxSeen = "1";
      if (first && el.getBoundingClientRect().top < innerHeight * .92) el.dataset.in = "1";
      else io.observe(el);
    });
    scan(true);
    root.classList.add("fx");
    const mo = new MutationObserver(() => scan(false));
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [path]);

  // Свечение за курсором и наклон карточек.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(hover: hover)").matches) return;
    const root = document.documentElement;
    let raf = 0, x = innerWidth / 2, y = innerHeight / 3, card = null;
    const paint = () => {
      raf = 0;
      root.style.setProperty("--px", `${x}px`);
      root.style.setProperty("--py", `${y}px`);
    };
    const reset = el => { el.style.removeProperty("--rx"); el.style.removeProperty("--ry"); };
    const onMove = e => {
      x = e.clientX; y = e.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
      const el = e.target.closest?.(TILT);
      if (card && card !== el) reset(card);
      card = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const u = (x - r.left) / r.width, v = (y - r.top) / r.height;
      el.style.setProperty("--mx", `${u * 100}%`);
      el.style.setProperty("--my", `${v * 100}%`);
      el.style.setProperty("--rx", `${(.5 - v) * 6}deg`);
      el.style.setProperty("--ry", `${(u - .5) * 8}deg`);
    };
    const onLeave = () => { if (card) reset(card); card = null; };
    addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => { removeEventListener("pointermove", onMove); document.removeEventListener("pointerleave", onLeave); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="bg-fx" aria-hidden="true">
      <span className="blob b1" /><span className="blob b2" /><span className="blob b3" />
      <span className="spot" />
    </div>
  );
}
