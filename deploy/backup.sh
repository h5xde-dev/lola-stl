#!/usr/bin/env bash
# Ночная копия базы и картинок из админки. В cron: 30 3 * * * /opt/lola-stl/backup.sh
# Хранит 14 последних копий в /opt/lola-stl/backups.
# Для копии вне сервера добавьте выгрузку в S3, например: aws s3 cp "$F" s3://<бакет>/backups/
set -euo pipefail
cd /opt/lola-stl
mkdir -p backups
F="backups/lola-$(date +%F).sql.gz"
docker compose exec -T db pg_dump -U lola lola | gzip > "$F"
# Картинки главной, статей и фото моделей (папка .data/media в контейнере сайта)
M="backups/media-$(date +%F).tar.gz"
docker compose exec -T app sh -c 'cd /app/.data 2>/dev/null && [ -d media ] && tar -cz media || true' > "$M"
[ -s "$M" ] || rm -f "$M"
ls -1t backups/*.sql.gz | tail -n +15 | xargs -r rm --
ls -1t backups/media-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm --
echo "Копия базы: $F${M:+, картинки: $M}"
