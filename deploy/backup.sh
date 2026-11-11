#!/usr/bin/env bash
# Ночная копия базы. В cron: 30 3 * * * /opt/lola-stl/backup.sh
# Хранит 14 последних копий в /opt/lola-stl/backups (несколько МБ каждая).
# Для копии вне сервера добавьте выгрузку в S3, например: aws s3 cp "$F" s3://<бакет>/backups/
set -euo pipefail
cd /opt/lola-stl
mkdir -p backups
F="backups/lola-$(date +%F).sql.gz"
docker compose exec -T db pg_dump -U lola lola | gzip > "$F"
ls -1t backups/*.sql.gz | tail -n +15 | xargs -r rm --
echo "Копия базы: $F"
