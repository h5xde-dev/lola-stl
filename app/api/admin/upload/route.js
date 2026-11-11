import { adminOnly, bad, body, json, wrap } from "@/lib/server/http";
import { PART_SIZE, mpAbort, mpComplete, mpListParts, mpPartUrls, mpStart, s3Configured, saveStream } from "@/lib/server/storage";

export const dynamic = "force-dynamic";
const MAX = 5 * 1024 ** 3; // 5 ГБ на файл

const fileKey = (model, ext) => `models/${model}-${Date.now().toString(36)}.${ext}`;
const clean = s => String(s || "").replace(/[^a-z0-9_-]/gi, "");
const extOf = s => (String(s || "").toLowerCase() === "zip" ? "zip" : "stl");

// Загрузка STL/ZIP модели из админки.
// С S3 — частями напрямую в хранилище (JSON: start / resume / complete / abort).
// Без S3 — тело запроса пишется на диск потоком (.data/files).
export const POST = wrap(async req => {
  const deny = await adminOnly(); if (deny) return deny;
  const u = new URL(req.url);

  if (!s3Configured()) {
    const model = clean(u.searchParams.get("model"));
    if (!model || !req.body) return bad("Нет модели или файла");
    const key = fileKey(model, extOf(u.searchParams.get("ext")));
    try { const size = await saveStream(key, req.body, MAX); return json({ key, size }); }
    catch (e) { return bad(e.message || "Файл не сохранился", 413); }
  }

  const b = await body(req);
  if (b.action === "start") {
    const model = clean(b.model), size = Number(b.size);
    if (!model || !(size > 0) || size > MAX) return bad("Размер файла от 1 байта до 5 ГБ");
    const key = fileKey(model, extOf(b.ext));
    const uploadId = await mpStart(key);
    const count = Math.ceil(size / PART_SIZE);
    return json({ key, uploadId, partSize: PART_SIZE, done: [], urls: await mpPartUrls(key, uploadId, Array.from({ length: count }, (_, i) => i + 1)) });
  }
  if (b.action === "resume") {
    // Продолжить прерванную загрузку: какие части уже в хранилище и свежие ссылки на остальные
    const size = Number(b.size), count = Math.ceil(size / PART_SIZE);
    const parts = await mpListParts(b.key, b.uploadId).catch(() => null);
    if (!parts) return bad("Прерванная загрузка не найдена — начнём заново", 404);
    const done = parts.filter(p => p.Size === (p.PartNumber < count ? PART_SIZE : size - PART_SIZE * (count - 1))).map(p => p.PartNumber);
    const missing = Array.from({ length: count }, (_, i) => i + 1).filter(n => !done.includes(n));
    return json({ key: b.key, uploadId: b.uploadId, partSize: PART_SIZE, done, urls: await mpPartUrls(b.key, b.uploadId, missing) });
  }
  if (b.action === "complete") {
    try { const size = await mpComplete(b.key, b.uploadId, Number(b.size)); return json({ key: b.key, size }); }
    catch (e) { return bad(e.message || "Не удалось собрать файл из частей"); }
  }
  if (b.action === "abort") { await mpAbort(b.key, b.uploadId); return json({ ok: true }); }
  return bad("Неизвестное действие");
});
