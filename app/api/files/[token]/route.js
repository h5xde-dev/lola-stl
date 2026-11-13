import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { verify } from "@/lib/server/auth";
import { localFile, s3Configured } from "@/lib/server/storage";

export const dynamic = "force-dynamic";
// Выдача файла из локального хранилища по токену на 5 минут (когда S3 не подключён).
export async function GET(req, { params }) {
  if (s3Configured()) return new Response("Not found", { status: 404 });
  const t = verify(decodeURIComponent((await params).token));
  if (!t?.key) return new Response("Ссылка устарела. Вернитесь в личный кабинет или откройте ссылку на заказ и нажмите «Скачать» ещё раз.", { status: 410, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const path = await localFile(t.key);
  const { size } = await stat(path);
  return new Response(Readable.toWeb(createReadStream(path)), {
    headers: {
      "Content-Type": "application/octet-stream", "Content-Length": String(size), "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(t.filename || "model.stl")}`,
    },
  });
}
