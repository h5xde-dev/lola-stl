import { readFile } from "node:fs/promises";
import { mediaPath, mediaType } from "@/lib/server/media";

// Картинки из админки. Имя файла уникальное и не меняется, поэтому кешируются навсегда.
export async function GET(req, { params }) {
  const { file } = await params;
  const path = await mediaPath(file);
  const buf = path && await readFile(path).catch(() => null);
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(buf, { headers: { "Content-Type": mediaType(file), "Cache-Control": "public, max-age=31536000, immutable" } });
}
