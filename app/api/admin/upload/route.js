import { adminOnly, bad, json, wrap } from "@/lib/server/http";
import { localFile, s3Configured, uploadUrl } from "@/lib/server/storage";
import { writeFile } from "node:fs/promises";

export const dynamic = "force-dynamic";
// Загрузка STL/ZIP модели.
// С S3 — выдаём ссылку, по которой браузер грузит файл прямо в хранилище (большие файлы не идут через сайт).
// Без S3 — файл приходит сюда и сохраняется в .data/files (только для разработки).
export const POST = wrap(async req => {
  const deny = await adminOnly(); if (deny) return deny;
  const u = new URL(req.url);
  const modelId = (u.searchParams.get("model") || "").replace(/[^a-z0-9_-]/gi, "");
  const ext = (u.searchParams.get("ext") || "stl").toLowerCase() === "zip" ? "zip" : "stl";
  if (!modelId) return bad("Нет модели");
  const key = `models/${modelId}-${Date.now().toString(36)}.${ext}`;
  if (s3Configured()) return json({ key, url: await uploadUrl(key) });
  const path = await localFile(key);
  await writeFile(path, Buffer.from(await req.arrayBuffer()));
  return json({ key, stored: true });
});
