// Картинки сайта (главная, статьи, фото моделей), загруженные из админки.
// Лежат на диске сервера в .data/media (в Docker — том appdata, попадает в резервную копию)
// и отдаются по адресу /media/<файл>. Сайт показывает их через next/image: сжатие в WebP и нужный размер.

import { randomBytes } from "node:crypto";

export const MEDIA_MAX = 15 * 1024 * 1024;
const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
export const mediaType = file => TYPES[String(file).split(".").pop()] || null;

async function root() {
  const { join } = await import("node:path");
  return join(process.cwd(), ".data", "media");
}

// Тип по первым байтам файла, а не по имени: на сайт попадают только настоящие картинки
function sniff(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return "webp";
  return null;
}

export async function saveMedia(arrayBuffer, hint = "") {
  const buf = Buffer.from(arrayBuffer);
  if (!buf.length || buf.length > MEDIA_MAX) throw new Error("Картинка до 15 МБ");
  const ext = sniff(buf);
  if (!ext) throw new Error("Подойдут JPG, PNG или WebP");
  const { join } = await import("node:path");
  const { mkdir, writeFile } = await import("node:fs/promises");
  const base = String(hint).toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  const name = `${base ? base + "-" : ""}${Date.now().toString(36)}${randomBytes(3).toString("hex")}.${ext}`;
  const dir = await root();
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), buf);
  return { src: "/media/" + name, size: buf.length };
}

export async function mediaPath(file) {
  if (!/^[a-z0-9-]+\.(jpg|png|webp)$/.test(file)) return null;
  const { join } = await import("node:path");
  return join(await root(), file);
}

export async function listMedia() {
  const { readdir, stat } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const dir = await root();
  const files = await readdir(dir).catch(() => []);
  const rows = await Promise.all(files.filter(f => mediaType(f)).map(async f => ({ src: "/media/" + f, at: (await stat(join(dir, f))).mtimeMs })));
  return rows.sort((a, b) => b.at - a.at);
}
