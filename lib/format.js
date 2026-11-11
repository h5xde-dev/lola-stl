export const rub = n => Number(n).toLocaleString("ru-RU") + " ₽";
export function plural(n, f) { const a = Math.abs(n) % 100, b = a % 10; if (a > 10 && a < 20) return f[2]; if (b > 1 && b < 5) return f[1]; if (b === 1) return f[0]; return f[2]; }
export const models = n => n + " " + plural(n, ["модель", "модели", "моделей"]);
export const zipMb = m => Math.max(1, Math.round((m.mb || 0) * 0.38));
export const fmtDate = t => new Date(t).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
export function fmtDay(s) { const d = new Date(s + "T12:00:00"); return isNaN(d) ? s : d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }); }
export const fmtSize = mb => (mb >= 1024 ? (mb / 1024).toFixed(1).replace(".", ",") + " ГБ" : mb + " МБ");
