# AGENTS.md — reshis-avia

Правила для ИИ-агентов. Claude Code читает этот файл через `CLAUDE.md`.

## Задача

Кейс «Разработка» турнира «Решись!»: прогноз продаж авиабилетов.

- Пользователь вводит пункт отправления, пункт назначения, дату вылета и цену
  билета и видит число мест (`seats`) и прогноз продаж.
- Данные в `data/`:
  - `seasonal_forecast.csv` — `route, date, seats` и для каждого сценария
    q = 0.1…0.9 тройка `{q}_base_demand, {q}_price, {q}_price_demand`;
  - `routes.csv` — `route, name, base_price, cost_per_passenger,
    price_sensitivity, price_min, price_max`.
- Формула: желают = `0.5_base_demand − price_sensitivity × (цена − base_price)`;
  купят = `min(seats, max(0, желают))`.
- Дополнительно: график распределения спроса при введённой цене (9 сценариев
  0.1–0.9 по той же формуле, медиана совпадает с «желают», на графике отмечено
  `seats`), регистрация, вход, размещение на хостинге.
- Все расчёты делает бэкенд. Форма на Next.js отправляет данные клиентским
  `fetch` из TS-кода (`apps/frontend/lib/api/*`), не server actions.

## Стек и структура

- `apps/backend` — NestJS 11, Prisma 6, PostgreSQL, Redis (сессии, лимиты).
- `apps/frontend` — Next.js 16 (App Router), React 19, Tailwind 4.
- `packages/shared` — общий контракт: типы ответов, DTO, константы, правила
  пароля. После правок: `npm --prefix packages/shared run build`.
- `infra` — Caddy и Redis для прода, init-скрипт Postgres.
- `data` — исходные CSV кейса.

Перед фронтенд-кодом читать доки в `node_modules/next/dist/docs/`: API этой
версии Next отличаются от привычных (`proxy.ts` вместо middleware, `retry` в
`error.tsx`).

## Запуск

```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/backend/.env.test.example apps/backend/.env.test
cp apps/frontend/.env.example apps/frontend/.env.local
npm install
npm run dev   # поднимает Postgres и Redis, накатывает миграции, запускает всё
```

Фронтенд http://localhost:3500, API http://localhost:3501/api/v1, Swagger
http://localhost:3501/docs. Порты публикуются только на `127.0.0.1`: Docker
публикует порт мимо файрвола.

Прод: на сервере клон репозитория и `.env` (переменные — раздел «Прод» в
`.env.example`). Выкладка — `./scripts/deploy.sh` на сервере: git pull,
сборка, миграции, запуск, проверка снаружи и smoke.

## Соглашения

- Любой ответ API — конверт `{ data, error }`. Тексты ошибок по-русски;
  подробности 5xx наружу не уходят, только в журнал с `requestId`.
- DTO: интерфейс в `packages/shared`, класс с class-validator на бэкенде
  объявлен `implements` этого интерфейса — расхождение ловит компилятор.
- Валидация глобальная: `whitelist` + `forbidNonWhitelisted`.
- Пользователь берётся только из сессии: `@CurrentUserId()` за
  `SessionAuthGuard`, никогда из тела запроса или пути. Данные пользователя
  ограничиваются им на уровне запроса к базе.
- Пароли — argon2id. Сессия — случайный идентификатор в httpOnly-куке, данные в
  Redis; выход отзывает её сразу.
- Тексты интерфейса — на русском.
- Не добавлять страниц, кнопок и ссылок, за которыми ничего нет.
- Не утверждать, что что-то работает, без проверки.

## Проверки

```bash
npm --prefix apps/backend run typecheck   # не голый tsc: см. ниже
npm --prefix apps/frontend run typecheck
npm --prefix apps/backend run lint && npm --prefix apps/frontend run lint
npm --prefix apps/backend test
npm --prefix apps/backend run test:e2e    # база reshis_avia_test
npm run build
```

## Подводные камни

- Голый `npx tsc --noEmit` в `apps/backend` ломает dev-сервер: из-за
  `incremental` он пишет `tsbuildinfo`, и `nest build` перестаёт собирать.
  Только `npm --prefix apps/backend run typecheck`. Если уже сломалось —
  `rm -rf apps/backend/dist` и перезапуск.
- e2e работают только с базой `*_test` (иначе отказываются стартовать) и сами
  накатывают на неё миграции. Пароль — в `apps/backend/.env.test`.
- `pino-pretty` выключается в тестах по `JEST_WORKER_ID`: его рабочий поток
  Jest не закрывает, и тесты висят без вывода.
- Tailwind 4 не ставит кнопкам `cursor: pointer` — правило в `globals.css`.
