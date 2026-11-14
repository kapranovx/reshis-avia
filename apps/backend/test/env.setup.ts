// Порядок: переменные окружения (CI), потом .env.test, потом дефолты ниже.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

process.env.NODE_ENV = 'test';

// process.loadEnvFile не подходит: он пишет в env процесса, а у Jest своя копия process.env.
const localTestEnv = join(__dirname, '..', '.env.test');
if (existsSync(localTestEnv)) {
  const vars = parseEnv(readFileSync(localTestEnv, 'utf8'));
  for (const [key, value] of Object.entries(vars)) process.env[key] ??= value;
}

process.env.DATABASE_URL ??=
  'postgresql://reshis_avia:reshis_avia_dev_password@localhost:5437/reshis_avia_test?schema=public';

// Тесты чистят таблицы, поэтому разрешаем только базу *_test.
const database = new URL(process.env.DATABASE_URL).pathname.slice(1);
if (!database.endsWith('_test')) {
  throw new Error(
    `e2e чистят таблицы, поэтому база должна называться *_test, а не "${database}"`,
  );
}
// Redis db 1, нулевая занята под разработку.
process.env.REDIS_URL ??= 'redis://localhost:6382/1';
process.env.CORS_ORIGIN ??= 'http://localhost:3500';
process.env.TRUST_PROXY_HOPS ??= '0';
process.env.LOG_LEVEL ??= 'silent';
// Контрольные числа e2e посчитаны по исходному файлу кейса, а не по своему прогнозу.
process.env.FORECAST_CSV ??= 'data/seasonal_forecast.csv';
