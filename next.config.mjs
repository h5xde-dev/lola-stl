/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Компактная сборка для сервера: в образ попадает только то, что нужно для работы (без лишних node_modules).
  output: "standalone",
  // Обработка фото — главный источник всплесков памяти. Меньше размеров и только WebP (AVIF кодируется
  // в разы тяжелее), готовые варианты кешируются на 30 дней и повторно не пересчитываются.
  images: {
    formats: ["image/webp"],
    deviceSizes: [384, 640, 828, 1200],
    imageSizes: [64, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  turbopack: { root: import.meta.dirname },
  // Встроенный Postgres (PGlite) грузит свои файлы сам — его нельзя упаковывать сборщиком.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Фото моделей читаются картинками для соцсетей с диска, их нужно положить в серверную сборку.
  outputFileTracingIncludes: { "/**/opengraph-image*": ["./public/images/works/**"] },
  // Запрет индексации задаётся мета-тегом и robots.txt — оба читают INDEXING при запуске, а не при сборке.
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ] }];
  },
};
export default nextConfig;
