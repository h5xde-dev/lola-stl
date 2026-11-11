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
      // Адреса вида endpoint/bucket/key: их понимают Yandex Object Storage, Timeweb, Selectel и MinIO
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
      // Без автоматических контрольных сумм: иначе SDK вписывает в подписанную ссылку сумму пустого тела,
      // и хранилище отклоняет настоящую часть файла (а российские S3 часто не знают этих заголовков вовсе)
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
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

// ---------- загрузка больших файлов частями (S3 multipart) ----------
// Браузер режет файл на части по 16 МБ и грузит их напрямую в хранилище по одноразовым ссылкам.
// Сервер сайта файл не видит: ни память, ни трафик сервера на загрузку не тратятся.
// Оборвалась связь — повторяется только упавшая часть; закрыли вкладку — загрузка продолжится с места остановки.
export const PART_SIZE = 16 * 1024 * 1024;
const PART_TTL = 6 * 3600; // ссылки на части живут 6 часов — хватит и на медленный интернет

async function cmd(name) { return (await import("@aws-sdk/client-s3"))[name]; }
const Bucket = () => process.env.S3_BUCKET;

export async function mpStart(key, contentType = "application/octet-stream") {
  const C = await cmd("CreateMultipartUploadCommand");
  const r = await (await s3()).send(new C({ Bucket: Bucket(), Key: key, ContentType: contentType }));
  return r.UploadId;
}
export async function mpPartUrls(key, uploadId, partNumbers) {
  const C = await cmd("UploadPartCommand");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const c = await s3();
  return Promise.all(partNumbers.map(async n => ({ n, url: await getSignedUrl(c, new C({ Bucket: Bucket(), Key: key, UploadId: uploadId, PartNumber: n }), { expiresIn: PART_TTL }) })));
}
// Уже загруженные части: берём у хранилища, а не у браузера (браузеру не нужен доступ к ETag)
export async function mpListParts(key, uploadId) {
  const C = await cmd("ListPartsCommand");
  const c = await s3(), parts = [];
  let marker;
  do {
    const r = await c.send(new C({ Bucket: Bucket(), Key: key, UploadId: uploadId, PartNumberMarker: marker }));
    (r.Parts || []).forEach(p => parts.push({ PartNumber: p.PartNumber, ETag: p.ETag, Size: p.Size }));
    marker = r.IsTruncated ? r.NextPartNumberMarker : undefined;
  } while (marker);
  return parts.sort((a, b) => a.PartNumber - b.PartNumber);
}
export async function mpComplete(key, uploadId, expectedSize) {
  const parts = await mpListParts(key, uploadId);
  const size = parts.reduce((a, p) => a + p.Size, 0);
  if (expectedSize && size !== expectedSize) throw new Error(`Загружено ${size} из ${expectedSize} байт`);
  const C = await cmd("CompleteMultipartUploadCommand");
  await (await s3()).send(new C({ Bucket: Bucket(), Key: key, UploadId: uploadId, MultipartUpload: { Parts: parts.map(({ PartNumber, ETag }) => ({ PartNumber, ETag })) } }));
  return size;
}
export async function mpAbort(key, uploadId) {
  const C = await cmd("AbortMultipartUploadCommand");
  await (await s3()).send(new C({ Bucket: Bucket(), Key: key, UploadId: uploadId })).catch(() => {});
}

// Удалить файл, который больше не нужен (модель получила новый файл или удалена)
export async function deleteFile(key) {
  if (!key) return;
  if (s3Configured()) {
    const C = await cmd("DeleteObjectCommand");
    await (await s3()).send(new C({ Bucket: Bucket(), Key: key })).catch(() => {});
    return;
  }
  const { join, normalize } = await import("node:path");
  const { unlink } = await import("node:fs/promises");
  const root = join(process.cwd(), ".data", "files");
  const path = normalize(join(root, key));
  if (path.startsWith(root)) await unlink(path).catch(() => {});
}

// Без S3: файл пишется на диск потоком — память не зависит от размера файла.
// Сначала во временный файл, затем переименование: недогруженный файл никогда не попадёт к покупателю.
export async function saveStream(key, webStream, maxBytes) {
  const { join, normalize, dirname } = await import("node:path");
  const { mkdir, rename, unlink } = await import("node:fs/promises");
  const { createWriteStream } = await import("node:fs");
  const { Readable, Transform } = await import("node:stream");
  const { pipeline } = await import("node:stream/promises");
  const root = join(process.cwd(), ".data", "files");
  const path = normalize(join(root, key));
  if (!path.startsWith(root)) throw new Error("bad key");
  await mkdir(dirname(path), { recursive: true });
  const tmp = path + ".part";
  let bytes = 0;
  const limit = new Transform({
    transform(chunk, _, cb) { bytes += chunk.length; cb(bytes > maxBytes ? new Error("Файл больше допустимого размера") : null, chunk); },
  });
  try {
    await pipeline(Readable.fromWeb(webStream), limit, createWriteStream(tmp));
    await rename(tmp, path);
    return bytes;
  } catch (e) { await unlink(tmp).catch(() => {}); throw e; }
}
