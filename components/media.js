// Загрузка картинки из админки: уменьшаем в браузере до max px по длинной стороне (JPEG 85%)
// и отправляем на сервер. Возвращает адрес вида /media/<файл>.
import { api } from "./Store";

function shrink(file, max) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => (b ? resolve(b) : reject(new Error("Не получилось обработать картинку"))), "image/jpeg", .85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Файл не открылся как картинка")); };
    img.src = url;
  });
}

export async function uploadImage(file, max = 2000) {
  const blob = await shrink(file, max);
  const name = encodeURIComponent((file.name || "").slice(0, 60));
  const r = await fetch(`/api/admin/media?name=${name}`, { method: "POST", body: blob, headers: { "Content-Type": "application/octet-stream" }, credentials: "same-origin" });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Картинка не загрузилась");
  return data.src;
}

export const listImages = async () => (await api("/api/admin/media")).data?.items || [];
