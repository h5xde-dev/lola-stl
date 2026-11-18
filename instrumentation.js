// Выполняется один раз при запуске сервера.
// 1. Главная собирается при сборке образа из начальных данных — сразу после старта
//    сбрасываем кеш страниц, чтобы посетители видели каталог и цены из рабочей базы.
// 2. Раз в минуту сервер сам спрашивает у банка статус неоплаченных заказов — на случай, если
//    уведомление об оплате не пришло, а покупатель закрыл страницу. Раз в 10 минут — заодно
//    заказы, отменённые по таймеру за последнюю неделю (платёжная ссылка Точки живёт 7 дней).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const { sign } = await import("./lib/server/auth.js");
  const port = process.env.PORT || 3000;
  const call = (path, purpose) => fetch(`http://127.0.0.1:${port}${path}`, { method: "POST", headers: { "x-key": sign({ purpose, exp: Date.now() + 60000 }) } }).catch(() => {});
  setTimeout(() => call("/api/internal/revalidate", "revalidate"), 2000);
  const every = Number(process.env.PAYMENT_CHECK_SECONDS || 60) * 1000;
  let tick = 0;
  setInterval(() => { tick++; call(tick % 10 === 0 ? "/api/internal/payments?all=1" : "/api/internal/payments", "payments"); }, every).unref?.();
}
