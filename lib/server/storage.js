// Хранилище файлов моделей. Файлы никогда не лежат по публичному адресу.
// S3_BUCKET задан — S3-совместимое хранилище (Yandex Object Storage, Selectel): ссылка на 5 минут.
// Не задан — папка .data/files: файл отдаёт /api/files/<токен>, токен тоже живёт 5 минут.

import { sign } from "./auth.js";

export const LINK_TTL = 300; // секунд
export const s3Configured = () => !!process.env.S3_BUCKET;

let client;
async function s3() {
  if (!client) {
    const { S3Client } = await import("@aws-sdk/client-s3");
    client = new S3Client({
      region: process.env.S3_REGION || "ru-central1",
      endpoint: process.env.S3_ENDPOINT || "https://storage.yandexcloud.net",
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY },
    });
  }
  return client;
}

// Личная ссылка на скачивание. filename — имя, под которым сохранится файл (с номером заказа).
export async function downloadUrl(key, filename) {
  if (s3Configured()) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const cmd = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET, Key: key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    });
    return getSignedUrl(await s3(), cmd, { expiresIn: LINK_TTL });
  }
  return "/api/files/" + sign({ key, filename, exp: Date.now() + LINK_TTL * 1000 });
}

// Ссылка для загрузки файла из админки прямо в хранилище (минуя сервер сайта).
export async function uploadUrl(key, contentType = "application/octet-stream") {
  if (!s3Configured()) return null;
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  return getSignedUrl(await s3(), new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, ContentType: contentType }), { expiresIn: 3600 });
}

// Локальное хранилище: путь к файлу. Если файла нет — создаётся простой STL-заглушки (только для разработки).
export async function localFile(key) {
  const { join, normalize, dirname } = await import("node:path");
  const fs = await import("node:fs/promises");
  const root = join(process.cwd(), ".data", "files");
  const path = normalize(join(root, key));
  if (!path.startsWith(root)) throw new Error("bad key");
  try { await fs.access(path); }
  catch {
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, `solid placeholder\n  facet normal 0 0 1\n    outer loop\n      vertex 0 0 0\n      vertex 1 0 0\n      vertex 0 1 0\n    endloop\n  endfacet\nendsolid placeholder\n`);
  }
  return path;
}
