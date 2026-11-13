import { adminOnly, bad, json, wrap } from "@/lib/server/http";
import { listMedia, MEDIA_MAX, saveMedia } from "@/lib/server/media";

export const dynamic = "force-dynamic";

// Загруженные картинки — для выбора в разделах «Главная» и «Статьи»
export const GET = wrap(async () => {
  const deny = await adminOnly(); if (deny) return deny;
  return json({ items: await listMedia() });
});

// Загрузка картинки: тело запроса — сам файл (браузер заранее уменьшает его до 2000 px)
export const POST = wrap(async req => {
  const deny = await adminOnly(); if (deny) return deny;
  if (Number(req.headers.get("content-length") || 0) > MEDIA_MAX) return bad("Картинка до 15 МБ", 413);
  try { return json(await saveMedia(await req.arrayBuffer(), new URL(req.url).searchParams.get("name") || "")); }
  catch (e) { return bad(e.message || "Картинка не сохранилась"); }
});
