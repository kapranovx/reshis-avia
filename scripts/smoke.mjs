import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = new URL(process.argv[2] ?? 'http://localhost:3501/api/v1');
if (
  !['http:', 'https:'].includes(base.protocol) ||
  base.username ||
  base.password
) {
  throw new Error('Укажите HTTP(S)-адрес API без логина и пароля в URL');
}
base.pathname = base.pathname.replace(/\/+$/, '');
base.search = '';
base.hash = '';

const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;
if (Boolean(email) !== Boolean(password)) {
  console.error(
    '✗ Задайте вместе SMOKE_EMAIL и SMOKE_PASSWORD либо уберите обе переменные',
  );
  process.exit(1);
}

let cookie = '';
let failed = 0;
let loggedOut = false;

async function request(
  path,
  { method = 'GET', body, authenticated = true } = {},
) {
  const response = await fetch(`${base}${path}`, {
    method,
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(authenticated && cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const envelope = response.status === 204 ? null : await response.json();
  return { response, envelope };
}

function status(result, expected) {
  assert.equal(
    result.response.status,
    expected,
    `ожидался HTTP ${expected}, получен ${result.response.status}`,
  );
  if (expected >= 200 && expected < 300 && expected !== 204) {
    assert.equal(result.envelope?.error, null, 'в успешном ответе есть ошибка');
    assert.ok(result.envelope?.data, 'нет данных в ответе');
  }
}

async function check(number, label, run) {
  try {
    const detail = await run();
    console.log(`✓ ${number}. ${label}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    failed++;
    // AssertionError включает actual/expected; наружу выводим только наше пояснение.
    const message =
      error instanceof assert.AssertionError
        ? error.message.split('\n')[0]
        : 'запрос не завершился или API вернул некорректный ответ';
    console.error(`✗ ${number}. ${label} — ${message}`);
  }
}

function requireSession() {
  assert.ok(cookie, 'нет сессии после шага 3');
}

try {
  await check(1, 'Состояние сервиса', async () => {
    status(await request('/health', { authenticated: false }), 200);
    return 'HTTP 200';
  });
  await check(2, 'Маршруты защищены входом', async () => {
    status(await request('/routes', { authenticated: false }), 401);
    return 'HTTP 401';
  });
  await check(3, email ? 'Вход' : 'Регистрация', async () => {
    const result = await request(email ? '/auth/login' : '/auth/signup', {
      method: 'POST',
      authenticated: false,
      body: email
        ? { email, password }
        : {
            name: 'Проверка сайта',
            email: `smoke-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`,
            password: randomUUID(),
          },
    });
    status(result, email ? 200 : 201);
    cookie =
      result.response.headers
        .getSetCookie()
        .find((value) => value.startsWith('reshis_avia_session='))
        ?.split(';')[0] ?? '';
    assert.ok(cookie, 'API не установил сессию');
    return `HTTP ${result.response.status}, сессия получена`;
  });
  await check(4, 'Список маршрутов', async () => {
    requireSession();
    const result = await request('/routes');
    status(result, 200);
    assert.ok(
      Array.isArray(result.envelope.data),
      'маршруты должны быть списком',
    );
    assert.equal(result.envelope.data.length, 5, 'ожидалось 5 маршрутов');
    return '5 маршрутов';
  });
  const forecastPath =
    '/forecast?origin=MOW&destination=AER&date=2026-06-01&price=';
  // Шаги 5 и 6 не зависят от файла прогноза: числа берутся из ответов API
  // и сверяются с формулой кейса.
  const forecastAt = async (price) => {
    const result = await request(`${forecastPath}${price}`);
    status(result, 200);
    return result.envelope.data;
  };
  let atBase = null;
  await check(5, 'Формула кейса при 9 347 ₽', async () => {
    requireSession();
    const data = await forecastAt(9347);
    atBase = await forecastAt(data.basePrice);
    const wants =
      atBase.simple.wants - data.priceSensitivity * (9347 - data.basePrice);
    assert.ok(
      Math.abs(data.simple.wants - wants) < 1e-6,
      'спрос не совпадает с формулой кейса',
    );
    assert.ok(
      Math.abs(data.simple.sales - Math.min(data.seats, Math.max(0, wants))) <
        1e-6,
      'продажи не совпадают с формулой кейса',
    );
    assert.equal(data.scenarios.length, 9, 'ожидалось 9 сценариев');
    assert.equal(
      data.scenarios.find((s) => s.quantile === 0.5)?.wants,
      data.simple.wants,
      'медиана не совпадает с простым прогнозом',
    );
    return `спрос ${data.simple.wants.toFixed(3).replace('.', ',')} по формуле; 9 сценариев, медиана совпадает`;
  });
  await check(6, 'Ограничение мест', async () => {
    requireSession();
    assert.ok(atBase, 'нет прогноза после шага 5');
    // Цена на 100 ₽ ниже той, при которой желающих ровно столько, сколько мест.
    const price =
      Math.floor(
        atBase.basePrice -
          (atBase.seats - atBase.simple.wants) / atBase.priceSensitivity,
      ) - 100;
    assert.ok(price > 0, 'спроса не хватает, чтобы заполнить самолёт');
    const data = await forecastAt(price);
    assert.equal(data.limitedBySeats, true, 'нет признака ограничения мест');
    assert.equal(
      data.simple.sales,
      data.seats,
      `ожидалось ${data.seats} продаж`,
    );
    return `при ${price} ₽ продано ${data.seats} из ${data.seats}, limitedBySeats=true`;
  });
  await check(7, 'Отрицательная цена', async () => {
    requireSession();
    const result = await request(`${forecastPath}-1`);
    status(result, 400);
    assert.equal(
      result.envelope?.error?.message,
      'Цена должна быть больше нуля',
      'нет ожидаемого русского сообщения',
    );
    return 'HTTP 400, «Цена должна быть больше нуля»';
  });
  await check(8, 'Выход отзывает сессию', async () => {
    requireSession();
    status(await request('/auth/logout', { method: 'POST' }), 204);
    loggedOut = true;
    // Повторно отправляем старую куку, чтобы проверить отзыв сессии на сервере.
    status(await request('/routes'), 401);
    return 'HTTP 204, затем HTTP 401 со старой кукой';
  });
} finally {
  if (cookie && !loggedOut) {
    await request('/auth/logout', { method: 'POST' }).catch(() => undefined);
  }
}

console.log(`Проверок: 8, ошибок: ${failed}`);
process.exitCode = failed ? 1 : 0;
