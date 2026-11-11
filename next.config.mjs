/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  turbopack: { root: import.meta.dirname },
  // Фото моделей читаются картинками для соцсетей с диска, их нужно положить в серверную сборку.
  outputFileTracingIncludes: { "/**/opengraph-image*": ["./public/images/works/**"] },
  async headers() {
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];
    // Пока индексация выключена, запрет дублируется заголовком на всех ответах.
    if (process.env.INDEXING !== "on") base.push({ key: "X-Robots-Tag", value: "noindex, nofollow" });
    return [{ source: "/:path*", headers: base }];
  },
};
export default nextConfig;
