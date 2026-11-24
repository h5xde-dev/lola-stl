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
ls -1t backups/media-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -- || true
[ -f "$M" ] && echo "Копия базы: $F, картинки: $M" || echo "Копия базы: $F"
# Старые версии образа сайта копятся после каждой выкладки (по ~150 МБ) и однажды уже заполнили диск —
# удаляем неиспользуемые старше двух суток (последние остаются для отката).
docker image prune -af --filter "until=48h" >/dev/null 2>&1 || true
# Предупреждение в журнале копий, если на диске мало места: база данных при заполненном диске останавливается.
FREE=$(df -Pm / | awk 'NR==2{print $4}')
[ "$FREE" -lt 3000 ] && echo "ВНИМАНИЕ: на диске осталось ${FREE} МБ" || true
