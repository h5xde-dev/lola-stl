// Создаёт и заполняет встроенную базу (PGlite) до сборки. Иначе на чистой машине несколько потоков
// next build одновременно создают .data/pglite и мешают друг другу. С DATABASE_URL ничего не делает.
if (!process.env.DATABASE_URL) {
  const { db } = await import("../lib/server/db.js");
  await db();
  console.log("Встроенная база готова");
}
process.exit(0);
