import { PassThrough, Readable } from "node:stream";
import archiver from "archiver";
import { verify } from "@/lib/server/auth";
import { orderById, orderCode } from "@/lib/server/repo";
import { orderFiles } from "@/lib/server/shop";
import { openFile } from "@/lib/server/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Файл открывается только когда архиватор до него дошёл: не держим открытыми десятки файлов
// и не запускаем разом десятки загрузок из S3.
function lazy(key) {
  const out = new PassThrough();
  let started = false;
  const read = out._read.bind(out);
  out._read = n => {
    if (!started) {
      started = true;
      openFile(key).then(src => { src.on("error", e => out.destroy(e)); src.pipe(out); }).catch(e => out.destroy(e));
    }
    return read(n);
  };
  return out;
}

// ZIP со всеми файлами заказа, собирается потоком. STL без сжатия (store): архив отдаётся сразу,
// сервер не тратит процессор, а файлы в архиве те же, что при скачивании по одному.
export async function GET(req, { params }) {
  const t = verify(decodeURIComponent((await params).token));
  const o = t?.zip ? await orderById(t.zip) : null;
  if (!o || !["paid", "review"].includes(o.status)) {
    return new Response("Ссылка устарела. Откройте заказ и нажмите «Скачать всё» ещё раз.", { status: 410, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const files = await orderFiles(o);
  const zip = archiver("zip", { store: true });
  zip.on("warning", e => console.error("zip:", e.message));
  zip.on("error", e => console.error("zip:", e.message));
  for (const f of files) zip.append(lazy(f.key), { name: f.name });
  zip.finalize();
  req.signal?.addEventListener("abort", () => zip.abort());
  const name = `lola.stl_${orderCode(o.id)}.zip`;
  return new Response(Readable.toWeb(zip), {
    headers: { "Content-Type": "application/zip", "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}` },
  });
}
