"use client";
// Загрузка STL/ZIP из админки.
// S3: файл режется на части по 16 МБ, три части грузятся одновременно прямо в хранилище,
// каждая при сбое повторяется до 4 раз. Номер загрузки запоминается в браузере: если вкладку
// закрыли или пропал интернет, повторный выбор того же файла продолжит с места остановки.
// Без S3: файл одним потоком уходит на сервер сайта и пишется на диск.

const API = "/api/admin/upload";
const PARALLEL = 3, RETRIES = 4;

const post = async body => {
  const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(data.error || "Сервер не ответил"); e.status = r.status; throw e; }
  return data;
};

// PUT/POST с прогрессом и возможностью отмены
function send(method, url, blob, onProgress, ctl) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    ctl.xhrs.add(xhr);
    xhr.open(method, url);
    xhr.upload.onprogress = e => e.lengthComputable && onProgress(e.loaded);
    xhr.onload = () => { ctl.xhrs.delete(xhr); xhr.status < 300 ? resolve(xhr.responseText) : reject(Object.assign(new Error("HTTP " + xhr.status), { status: xhr.status })); };
    xhr.onerror = () => { ctl.xhrs.delete(xhr); reject(new Error("network")); };
    xhr.onabort = () => { ctl.xhrs.delete(xhr); reject(Object.assign(new Error("abort"), { aborted: true })); };
    xhr.send(blob);
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const memoKey = (model, f) => `lola-upload:${model}:${f.name}:${f.size}:${f.lastModified}`;

// Возвращает { promise, cancel }. onProgress(loadedBytes, totalBytes)
export function uploadModelFile({ file, modelId, storage, onProgress }) {
  const ctl = { xhrs: new Set(), cancelled: false, state: null };
  const ext = /\.zip$/i.test(file.name) ? "zip" : "stl";

  const promise = (async () => {
    if (storage !== "s3") {
      const text = await send("POST", `${API}?model=${encodeURIComponent(modelId)}&ext=${ext}`, file, n => onProgress(n, file.size), ctl);
      return JSON.parse(text);
    }

    const mk = memoKey(modelId, file);
    let st = null;
    try { const saved = JSON.parse(localStorage.getItem(mk) || "null"); if (saved) st = await post({ action: "resume", key: saved.key, uploadId: saved.uploadId, size: file.size }); }
    catch { st = null; }
    if (!st) st = await post({ action: "start", model: modelId, ext, size: file.size });
    ctl.state = st;
    try { localStorage.setItem(mk, JSON.stringify({ key: st.key, uploadId: st.uploadId })); } catch {}

    const size = n => Math.min(st.partSize, file.size - (n - 1) * st.partSize);
    const progress = new Map(st.done.map(n => [n, size(n)]));
    const report = () => onProgress([...progress.values()].reduce((a, b) => a + b, 0), file.size);
    report();

    const queue = [...st.urls];
    const worker = async () => {
      while (queue.length && !ctl.cancelled) {
        const { n, url } = queue.shift();
        const blob = file.slice((n - 1) * st.partSize, (n - 1) * st.partSize + size(n));
        for (let attempt = 1; ; attempt++) {
          try { await send("PUT", url, blob, b => { progress.set(n, b); report(); }, ctl); progress.set(n, size(n)); report(); break; }
          catch (e) {
            if (e.aborted || ctl.cancelled) throw e;
            progress.set(n, 0); report();
            if (attempt >= RETRIES) throw new Error("Связь с хранилищем пропала. Выберите тот же файл ещё раз — загрузка продолжится с места остановки.");
            await wait(1000 * 2 ** (attempt - 1));
          }
        }
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
    if (ctl.cancelled) throw Object.assign(new Error("abort"), { aborted: true });
    const res = await post({ action: "complete", key: st.key, uploadId: st.uploadId, size: file.size });
    try { localStorage.removeItem(mk); } catch {}
    return res;
  })();

  const cancel = async () => {
    ctl.cancelled = true;
    ctl.xhrs.forEach(x => x.abort());
    if (ctl.state) {
      try { localStorage.removeItem(memoKey(modelId, file)); } catch {}
      await post({ action: "abort", key: ctl.state.key, uploadId: ctl.state.uploadId }).catch(() => {});
    }
  };
  return { promise, cancel };
}
