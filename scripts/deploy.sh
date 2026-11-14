#!/usr/bin/env bash
#
# Выкладка на сервере, из клона репозитория:
#   ./scripts/deploy.sh            git pull, сборка, миграции, запуск, проверка
#   ./scripts/deploy.sh --no-pull  то же для того, что уже лежит в рабочей копии
#
# Нужен .env в корне клона (README, раздел «Деплой»).
# Откат: git checkout <коммит> && ./scripts/deploy.sh --no-pull
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Caddyfile и redis.conf читаются в контейнерах не от root: файлы из
# git pull должны читаться всеми, даже если в оболочке umask 077.
umask 022

compose() { docker compose -f docker-compose.prod.yml "$@"; }
step() { printf '\n== %s\n' "$*"; }
fail() {
  printf '\nОстановлено: %s\n' "$*" >&2
  exit 1
}

[[ -f .env ]] || fail 'нет .env (README, раздел «Деплой»).'
domain="$(grep -m1 '^DOMAIN=' .env | cut -d= -f2- || true)"
[[ -n "$domain" ]] || fail 'в .env пустой DOMAIN.'
url="https://$domain"

step 'Код'
[[ "${1:-}" == --no-pull ]] || git pull --ff-only
git log -1 --format='%h %s'

step 'Сборка'
compose config --quiet
# Новые образы появляются раньше, чем удаляются старые: нужен запас.
free_mb="$(df -Pm "$(docker info -f '{{.DockerRootDir}}')" | awk 'NR == 2 {print $4}')"
((free_mb >= 3000)) ||
  fail "на диске свободно $free_mb МБ, нужно от 3000. Что занято: docker system df"
# ID базовых образов до обновления: после него прежние версии удаляются
# в «Уборке», и только они.
base_before="$(compose config --images | grep -v '^reshis-avia-' |
  xargs -r docker image inspect -f '{{.Id}}' 2>/dev/null || true)"
# --pull и pull: исправления безопасности в node, Postgres, Redis и Caddy
# приезжают только так. Теги закреплены на мажорной версии, формат данных
# не меняется. Сборки по одной, чтобы не удваивать пик памяти.
compose build --pull backend
compose build --pull frontend
compose pull --quiet postgres redis caddy

step 'Запуск'
# Сервис migrate применяет миграции, бэкенд стартует только после него.
compose up -d --remove-orphans
# Caddyfile подключён каталогом: новый файл виден сразу, но читается при reload.
compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile

step "Проверка $url"
# Health отвечает 503, если бэкенд не видит базу или Redis.
curl -fsS --retry 10 --retry-delay 3 --retry-all-errors --max-time 15 \
  -o /dev/null "$url/api/v1/health" ||
  fail "$url/api/v1/health не отвечает. Смотреть: docker compose -f docker-compose.prod.yml logs backend caddy"
curl -fsS --retry 5 --retry-delay 3 --retry-all-errors --max-time 15 \
  -o /dev/null "$url/" ||
  fail "$url/ не отвечает. Смотреть: docker compose -f docker-compose.prod.yml logs frontend"
# Сценарий scripts/smoke.mjs снаружи, через Caddy. Node берётся из образа
# бэкенда, на сервер его ставить не нужно.
docker run --rm -e SMOKE_EMAIL -e SMOKE_PASSWORD \
  -v "$PWD/scripts/smoke.mjs:/smoke.mjs:ro" reshis-avia-backend:latest \
  node /smoke.mjs "$url/api/v1" ||
  fail 'smoke не прошёл (строки с ✗ выше).'

step 'Уборка'
# Только образы проекта. Прежние версии наших образов остаются без тега,
# но с меткой compose-проекта.
docker image prune -f --filter label=com.docker.compose.project=reshis-avia | tail -n 1
# Прежние Postgres, Redis и Caddy метки проекта не имеют: удаляем по ID,
# если после pull они остались без тега.
dangling="$(docker images -q --no-trunc --filter dangling=true)"
for id in $base_before; do
  if grep -qxF "$id" <<<"$dangling"; then
    docker image rm "$id" >/dev/null && echo "Удалён прежний базовый образ ${id:7:12}" || true
  fi
done
# Кэш сборки сам не чистится, а без --all prune почти ничего не трогает.
# Сначала уходит то, чем не пользовались неделю, потом срезается объём.
# 3 ГБ хватает на слои с зависимостями: следующая сборка не с нуля.
docker builder prune -af --filter until=168h | tail -n 1
docker builder prune -af --max-used-space 3gb | tail -n 1

step 'Готово'
compose ps --format 'table {{.Name}}\t{{.Status}}'
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}'
