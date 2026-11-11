// Выполняется один раз при запуске сервера.
// Главная собирается при сборке образа из начальных данных — сразу после старта
// сбрасываем кеш страниц, чтобы посетители видели каталог и цены из рабочей базы.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const { sign } = await import("./lib/server/auth.js");
  const port = process.env.PORT || 3000;
  setTimeout(() => {
    fetch(`http://127.0.0.1:${port}/api/internal/revalidate`, { method: "POST", headers: { "x-key": sign({ purpose: "revalidate", exp: Date.now() + 60000 }) } })
      .catch(() => {});
  }, 2000);
}
