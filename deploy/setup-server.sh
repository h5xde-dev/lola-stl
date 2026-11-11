#!/usr/bin/env bash
# Первичная настройка чистого сервера Ubuntu 22.04/24.04 (2 ГБ RAM). Запуск от root:
#   bash setup-server.sh
set -euo pipefail

# 1 ГБ swap — подстраховка от нехватки памяти при всплесках
if ! swapon --show | grep -q swapfile; then
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 && echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf
fi

# Docker
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

# Брандмауэр: только SSH и веб
apt-get install -y ufw >/dev/null
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp && ufw --force enable

# Папка проекта
mkdir -p /opt/lola-stl
echo "Готово. Скопируйте в /opt/lola-stl файлы docker-compose.yml, Caddyfile и .env, затем:"
echo "  cd /opt/lola-stl && docker login ghcr.io && docker compose up -d"
