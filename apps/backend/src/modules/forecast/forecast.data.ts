import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { FORECAST_QUANTILES } from '@reshis-avia/shared';

export type Quantile = (typeof FORECAST_QUANTILES)[number];

export interface RouteParams {
  route: string;
  name: string;
  origin: string;
  originName: string;
  destination: string;
  destinationName: string;
  basePrice: number;
  priceSensitivity: number;
  priceMin: number;
  priceMax: number;
}

export interface FlightRow {
  route: string;
  date: string;
  seats: number;
  baseDemand: Record<Quantile, number>;
}

export interface ForecastData {
  // В порядке routes.csv, только маршруты, у которых есть рейсы.
  routes: RouteParams[];
  flights: Map<string, FlightRow>;
  dateRange: Map<string, { from: string; to: string }>;
}

export class ForecastDataError extends Error {
  override name = 'ForecastDataError';
}

// Свой прогноз из ИИ-блока. Исходный файл кейса data/seasonal_forecast.csv
// остаётся для тестов: на нём посчитаны контрольные числа.
export const DEFAULT_FORECAST_CSV = 'data/my_forecast.csv';
export const DEFAULT_ROUTES_CSV = 'data/routes.csv';

const ROUTE_CODE = /^[A-Z]{3}-[A-Z]{3}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const ROUTE_COLUMNS = [
  'route',
  'name',
  'base_price',
  'price_sensitivity',
  'price_min',
  'price_max',
];

const FORECAST_COLUMNS = [
  'route',
  'date',
  'seats',
  ...FORECAST_QUANTILES.map((q) => `${q}_base_demand`),
];

export const flightKey = (route: string, date: string) => `${route}|${date}`;

// Корень монорепо: ближайший package.json с workspaces. Так пути одинаковы
// для src, dist и образа Docker, где backend лежит в /repo/apps/backend.
export function findRepoRoot(start: string = __dirname): string {
  let dir = start;
  for (;;) {
    const pkg = join(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        const parsed = JSON.parse(readFileSync(pkg, 'utf8')) as {
          workspaces?: unknown;
        };
        if (parsed.workspaces) return dir;
      } catch {
        // Битый package.json по дороге не повод падать, ищем выше.
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

export function resolveDataPath(
  value: string | undefined,
  fallback: string,
): string {
  return resolve(findRepoRoot(), value?.trim() || fallback);
}

// Минимальный разбор CSV: кавычки, BOM, CRLF и пустые строки.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');

  const endRow = () => {
    row.push(field);
    field = '';
    if (!(row.length === 1 && row[0].trim() === '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (quoted) {
      if (ch !== '"') field += ch;
      else if (source[i + 1] === '"') {
        field += '"';
        i += 1;
      } else quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i += 1;
      endRow();
    } else field += ch;
  }
  if (field !== '' || row.length > 0) endRow();
  return rows;
}

interface Table {
  records: Record<string, string>[];
  // Номер строки в файле для сообщений об ошибках. Заголовок занимает строку 1.
  lineOf: (index: number) => number;
}

function readTable(path: string, required: string[]): Table {
  if (!existsSync(path)) {
    throw new ForecastDataError(`${path}: файл не найден`);
  }
  const [header, ...body] = parseCsv(readFileSync(path, 'utf8'));
  if (!header) throw new ForecastDataError(`${path}: файл пустой`);

  const columns = header.map((name) => name.trim());
  const missing = required.filter((name) => !columns.includes(name));
  if (missing.length > 0) {
    throw new ForecastDataError(`${path}: нет столбцов ${missing.join(', ')}`);
  }
  if (body.length === 0) throw new ForecastDataError(`${path}: нет данных`);

  return {
    records: body.map((cells) =>
      Object.fromEntries(columns.map((name, i) => [name, cells[i] ?? ''])),
    ),
    lineOf: (index) => index + 2,
  };
}

function numberIn(
  path: string,
  line: number,
  column: string,
  raw: string,
): number {
  const value = raw.trim() === '' ? NaN : Number(raw);
  if (!Number.isFinite(value)) {
    throw new ForecastDataError(
      `${path}, строка ${line}: в ${column} не число («${raw}»)`,
    );
  }
  return value;
}

function isRealDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

// Название маршрута делится на два города по тире. Если формат другой,
// вместо названий остаются коды.
function cityNames(name: string, origin: string, destination: string) {
  const parts = name.split(/\s+[—–-]\s+/);
  return parts.length === 2 && parts[0] && parts[1]
    ? { originName: parts[0].trim(), destinationName: parts[1].trim() }
    : { originName: origin, destinationName: destination };
}

function loadRoutes(path: string): Map<string, RouteParams> {
  const { records, lineOf } = readTable(path, ROUTE_COLUMNS);
  const routes = new Map<string, RouteParams>();

  records.forEach((r, i) => {
    const line = lineOf(i);
    const num = (column: string) => numberIn(path, line, column, r[column]);
    const route = r.route.trim();
    if (!ROUTE_CODE.test(route)) {
      throw new ForecastDataError(
        `${path}, строка ${line}: маршрут «${route}» не в формате MOW-AER`,
      );
    }
    if (routes.has(route)) {
      throw new ForecastDataError(
        `${path}, строка ${line}: маршрут ${route} повторяется`,
      );
    }

    const params = {
      basePrice: num('base_price'),
      priceSensitivity: num('price_sensitivity'),
      priceMin: num('price_min'),
      priceMax: num('price_max'),
    };
    if (
      params.basePrice <= 0 ||
      params.priceSensitivity < 0 ||
      params.priceMin <= 0 ||
      params.priceMax < params.priceMin
    ) {
      throw new ForecastDataError(
        `${path}, строка ${line}: цены должны быть больше нуля, price_min не больше price_max, чувствительность не отрицательная`,
      );
    }

    const [origin, destination] = route.split('-');
    const name = r.name.trim();
    routes.set(route, {
      route,
      name,
      origin,
      destination,
      ...cityNames(name, origin, destination),
      ...params,
    });
  });
  return routes;
}

function loadFlights(
  path: string,
  routes: Map<string, RouteParams>,
): Map<string, FlightRow> {
  const { records, lineOf } = readTable(path, FORECAST_COLUMNS);
  const flights = new Map<string, FlightRow>();

  records.forEach((r, i) => {
    const line = lineOf(i);
    const route = r.route.trim();
    const date = r.date.trim();
    if (!routes.has(route)) {
      throw new ForecastDataError(
        `${path}, строка ${line}: маршрута ${route} нет в routes.csv`,
      );
    }
    if (!isRealDate(date)) {
      throw new ForecastDataError(
        `${path}, строка ${line}: дата «${date}» не в формате YYYY-MM-DD`,
      );
    }
    const key = flightKey(route, date);
    if (flights.has(key)) {
      throw new ForecastDataError(
        `${path}, строка ${line}: рейс ${route} на ${date} повторяется`,
      );
    }

    const seats = numberIn(path, line, 'seats', r.seats);
    if (seats <= 0) {
      throw new ForecastDataError(
        `${path}, строка ${line}: мест должно быть больше нуля`,
      );
    }

    const baseDemand = Object.fromEntries(
      FORECAST_QUANTILES.map((q) => {
        const column = `${q}_base_demand`;
        return [q, numberIn(path, line, column, r[column])];
      }),
    ) as Record<Quantile, number>;

    flights.set(key, { route, date, seats, baseDemand });
  });
  return flights;
}

export function loadForecastData(paths: {
  forecast: string;
  routes: string;
}): ForecastData {
  const routes = loadRoutes(paths.routes);
  const flights = loadFlights(paths.forecast, routes);

  const dateRange = new Map<string, { from: string; to: string }>();
  for (const { route, date } of flights.values()) {
    const range = dateRange.get(route);
    if (!range) dateRange.set(route, { from: date, to: date });
    else {
      if (date < range.from) range.from = date;
      if (date > range.to) range.to = date;
    }
  }

  return {
    routes: [...routes.values()].filter((r) => dateRange.has(r.route)),
    flights,
    dateRange,
  };
}
