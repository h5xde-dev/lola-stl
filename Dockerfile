# Образ сайта для сервера. Собирается в GitHub Actions — на самом сервере сборка не запускается,
# поэтому серверу хватает 2 ГБ памяти (сборка Next.js сама по себе требует 1–1,5 ГБ).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Итоговый образ: только собранный сайт (режим standalone), без исходников и dev-зависимостей.
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
    # Потолок памяти JS: процесс не разрастается и держится в лимите контейнера
    NODE_OPTIONS=--max-old-space-size=320 \
    # Обработка фото в один поток — без всплесков памяти
    VIPS_CONCURRENCY=1
# Сертификаты Минцифры (Russian Trusted Root/Sub CA): на них работает API Точка Банка (enter.tochka.com).
# Файлы скачаны с официальной страницы gu-st.ru (ссылки из документации Точки). Node.js не читает
# системное хранилище, поэтому путь к нему передаётся через NODE_EXTRA_CA_CERTS.
COPY deploy/certs/russian_trusted_root_ca.crt deploy/certs/russian_trusted_sub_ca.crt /usr/local/share/ca-certificates/
RUN apk add --no-cache ca-certificates && update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
RUN addgroup -S app && adduser -S app -G app && mkdir -p /app/.data && chown app:app /app/.data
COPY --from=build /app/public ./public
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:3000/robots.txt >/dev/null || exit 1
CMD ["node", "server.js"]
