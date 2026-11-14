import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FORECAST_QUANTILES, MEDIAN_QUANTILE } from '@reshis-avia/shared';
import {
  bestPriceOf,
  calculateDay,
  calculateForecast,
  marginAt,
  salesOf,
  wantsAt,
} from './forecast.calc';
import {
  DEFAULT_FORECAST_CSV,
  DEFAULT_ROUTES_CSV,
  ForecastDataError,
  flightKey,
  loadForecastData,
  parseCsv,
  resolveDataPath,
  type ForecastData,
  type Quantile,
} from './forecast.data';

// Формулу проверяем на исходном файле кейса: контрольные числа посчитаны по
// нему и не зависят от того, как перегенерирован свой прогноз.
const CASE_FORECAST_CSV = 'data/seasonal_forecast.csv';

const data = loadForecastData({
  forecast: resolveDataPath(undefined, CASE_FORECAST_CSV),
  routes: resolveDataPath(undefined, DEFAULT_ROUTES_CSV),
});

const routeOf = (code: string) => {
  const route = data.routes.find((r) => r.route === code);
  if (!route) throw new Error(`нет маршрута ${code}`);
  return route;
};

const flightOf = (code: string, date: string) => {
  const flight = data.flights.get(flightKey(code, date));
  if (!flight) throw new Error(`нет рейса ${code} ${date}`);
  return flight;
};

const SAMPLE_DATES = ['2026-06-01', '2026-06-15', '2026-07-01'];

describe('формула прогноза', () => {
  it('при базовой цене «желают» ровно равно 0.5_base_demand', () => {
    for (const route of data.routes) {
      for (const date of SAMPLE_DATES) {
        const flight = flightOf(route.route, date);
        const result = calculateForecast(route, flight, route.basePrice);
        expect(result.simple.wants).toBe(flight.baseDemand[0.5]);
      }
    }
  });

  it('сценарий 0.5 всегда равен простому прогнозу', () => {
    for (const route of data.routes) {
      const prices = [1, route.priceMin, route.basePrice, route.priceMax, 1e6];
      for (const date of SAMPLE_DATES) {
        for (const price of prices) {
          const result = calculateForecast(
            route,
            flightOf(route.route, date),
            price,
          );
          const median = result.scenarios.find((s) => s.quantile === 0.5);
          expect(median?.wants).toBe(result.simple.wants);
          expect(median?.sales).toBe(result.simple.sales);
        }
      }
    }
  });

  it('«купят» всегда от нуля до числа мест', () => {
    for (const flight of data.flights.values()) {
      const route = routeOf(flight.route);
      for (const price of [1, route.priceMin, route.priceMax, 1_000_000]) {
        const result = calculateForecast(route, flight, price);
        for (const sales of [
          result.simple.sales,
          ...result.scenarios.map((s) => s.sales),
        ]) {
          expect(sales).toBeGreaterThanOrEqual(0);
          expect(sales).toBeLessThanOrEqual(flight.seats);
        }
      }
    }
  });

  it('для MOW-AER цена на 1000 ₽ выше базовой снижает «желают» на 141', () => {
    const route = routeOf('MOW-AER');
    const flight = flightOf('MOW-AER', '2026-06-15');
    const atBase = calculateForecast(route, flight, route.basePrice);
    const higher = calculateForecast(route, flight, route.basePrice + 1000);
    expect(atBase.simple.wants - higher.simple.wants).toBeCloseTo(141, 9);
  });

  it('сценариев ровно 9, от 0.1 до 0.9, в порядке base_demand', () => {
    for (const flight of data.flights.values()) {
      const route = routeOf(flight.route);
      const { scenarios } = calculateForecast(route, flight, 12_345);
      expect(scenarios.map((s) => s.quantile)).toEqual([...FORECAST_QUANTILES]);
      scenarios.forEach((s, i) => {
        if (i === 0) return;
        const prev = scenarios[i - 1];
        expect(s.wants - prev.wants).toBeCloseTo(
          flight.baseDemand[s.quantile as Quantile] -
            flight.baseDemand[prev.quantile as Quantile],
          9,
        );
      });
    }
  });

  it('контрольный пример: MOW-AER 1 июня по 9347 ₽', () => {
    const result = calculateForecast(
      routeOf('MOW-AER'),
      flightOf('MOW-AER', '2026-06-01'),
      9347,
    );
    expect(result.simple.wants).toBeCloseTo(726.073, 9);
    expect(result.simple.sales).toBeCloseTo(726.073, 9);
    expect(result.seats).toBe(900);
    expect(result.limitedBySeats).toBe(false);
    expect(result.priceOutOfRange).toBe(false);
  });

  it('продажи упираются в места, когда спрос выше', () => {
    const route = routeOf('MOW-AER');
    const flight = [...data.flights.values()].find(
      (f) => f.route === 'MOW-AER' && f.baseDemand[0.5] > f.seats,
    );
    expect(flight).toBeDefined();
    const result = calculateForecast(route, flight!, route.basePrice);
    expect(result.limitedBySeats).toBe(true);
    expect(result.simple.sales).toBe(flight!.seats);
    expect(result.scenarios.at(-1)?.limitedBySeats).toBe(true);
  });

  it('цена вне диапазона маршрута не ошибка, а пометка', () => {
    const route = routeOf('MOW-LED');
    const flight = flightOf('MOW-LED', '2026-06-10');
    expect(
      calculateForecast(route, flight, route.priceMin).priceOutOfRange,
    ).toBe(false);
    expect(
      calculateForecast(route, flight, route.priceMax).priceOutOfRange,
    ).toBe(false);
    expect(
      calculateForecast(route, flight, route.priceMin - 1).priceOutOfRange,
    ).toBe(true);
    expect(
      calculateForecast(route, flight, route.priceMax + 1).priceOutOfRange,
    ).toBe(true);
  });
});

describe('лучшая цена и маржинальная прибыль', () => {
  const own = loadForecastData({
    forecast: resolveDataPath(undefined, DEFAULT_FORECAST_CSV),
    routes: resolveDataPath(undefined, DEFAULT_ROUTES_CSV),
  });

  // Перебор всех цен диапазона по рублю: лучшая цена должна давать ту же
  // прибыль, что и самый выгодный вариант перебора.
  const bruteForce = (source: ForecastData) => {
    for (const flight of source.flights.values()) {
      const route = source.routes.find((r) => r.route === flight.route)!;
      const demand = flight.baseDemand[MEDIAN_QUANTILE];
      const margin = (p: number) =>
        marginAt(
          p,
          salesOf(wantsAt(demand, route, p), flight.seats),
          route.costPerPassenger,
        );
      let top = -Infinity;
      for (let p = route.priceMin; p <= route.priceMax; p += 1) {
        top = Math.max(top, margin(p));
      }
      const best = bestPriceOf(route, demand, flight.seats);
      expect(best).toBeGreaterThanOrEqual(route.priceMin);
      expect(best).toBeLessThanOrEqual(route.priceMax);
      expect(margin(best)).toBeCloseTo(top, 6);
    }
  };

  it('не хуже перебора всех цен по рублю: файл кейса', () => {
    bruteForce(data);
  });

  it('не хуже перебора всех цен по рублю: свой прогноз', () => {
    bruteForce(own);
  });

  // Готовый код ИИ-блока кладёт лучшую цену медианы в столбец 0.5_price.
  // Расхождение в несколько рублей — округление спроса в файле.
  it.each([
    ['файл кейса', 'data/seasonal_forecast.csv', data],
    ['свой прогноз', DEFAULT_FORECAST_CSV, own],
  ] as const)(
    'совпадает с 0.5_price из файла прогноза до 10 ₽: %s',
    (_name, file, source) => {
      const [header, ...rows] = parseCsv(
        readFileSync(resolveDataPath(undefined, file), 'utf8'),
      );
      const col = (name: string) => header.indexOf(name);
      expect(rows).toHaveLength(source.flights.size);
      for (const row of rows) {
        const flight = source.flights.get(
          flightKey(row[col('route')], row[col('date')]),
        )!;
        const route = source.routes.find((r) => r.route === flight.route)!;
        const best = bestPriceOf(
          route,
          flight.baseDemand[MEDIAN_QUANTILE],
          flight.seats,
        );
        expect(
          Math.abs(best - Number(row[col('0.5_price')])),
        ).toBeLessThanOrEqual(10);
      }
    },
  );

  it('прибыль при введённой цене и при лучшей считается по медиане', () => {
    const route = routeOf('MOW-AER');
    const flight = flightOf('MOW-AER', '2026-06-01');
    const result = calculateForecast(route, flight, 9347);
    const { pricing } = result;
    expect(pricing.costPerPassenger).toBe(4200);
    expect(pricing.margin).toBeCloseTo((9347 - 4200) * result.simple.sales, 6);
    expect(pricing.bestSales).toBeCloseTo(
      salesOf(
        wantsAt(flight.baseDemand[MEDIAN_QUANTILE], route, pricing.bestPrice),
        flight.seats,
      ),
      9,
    );
    expect(pricing.bestMargin).toBeCloseTo(
      (pricing.bestPrice - 4200) * pricing.bestSales,
      6,
    );
    expect(pricing.bestMargin).toBeGreaterThanOrEqual(pricing.margin);
  });

  it('когда желающих больше, чем мест, лучшая цена не ниже цены полного салона', () => {
    const route = routeOf('MOW-AER');
    const demand = 2000;
    const best = bestPriceOf(route, demand, 900);
    const fullCabin = route.basePrice + (demand - 900) / route.priceSensitivity;
    expect(best).toBeGreaterThanOrEqual(
      Math.min(route.priceMax, Math.floor(fullCabin)),
    );
  });

  it('без чувствительности к цене лучшая — верхняя граница диапазона', () => {
    const route = { ...routeOf('MOW-AER'), priceSensitivity: 0 };
    expect(bestPriceOf(route, 500, 900)).toBe(route.priceMax);
  });
});

describe('календарь загрузки', () => {
  it('прогноз на дату совпадает с простым прогнозом', () => {
    const route = routeOf('MOW-LED');
    for (const date of SAMPLE_DATES) {
      const flight = flightOf('MOW-LED', date);
      const day = calculateDay(route, flight, 6100);
      const full = calculateForecast(route, flight, 6100);
      expect(day).toEqual({
        date,
        seats: full.seats,
        wants: full.simple.wants,
        sales: full.simple.sales,
        limitedBySeats: full.limitedBySeats,
      });
    }
  });
});

describe('загрузка данных', () => {
  it('5 маршрутов, даты 2026-06-01…2026-07-01, у каждого рейса 9 сценариев', () => {
    expect(data.routes.map((r) => r.route)).toEqual([
      'MOW-AER',
      'MOW-LED',
      'MOW-KGD',
      'MOW-OVB',
      'MOW-MRV',
    ]);
    for (const route of data.routes) {
      expect(data.dateRange.get(route.route)).toEqual({
        from: '2026-06-01',
        to: '2026-07-01',
      });
    }
    expect(data.flights.size).toBe(155);
    for (const flight of data.flights.values()) {
      expect(Object.keys(flight.baseDemand)).toHaveLength(9);
      for (const q of FORECAST_QUANTILES) {
        expect(Number.isFinite(flight.baseDemand[q])).toBe(true);
      }
    }
  });

  it('свой прогноз по умолчанию загружается целиком и совпадает с кейсом по рейсам и местам', () => {
    const own = loadForecastData({
      forecast: resolveDataPath(undefined, DEFAULT_FORECAST_CSV),
      routes: resolveDataPath(undefined, DEFAULT_ROUTES_CSV),
    });
    expect(own.routes.map((r) => r.route)).toEqual(
      data.routes.map((r) => r.route),
    );
    expect([...own.flights.keys()].sort()).toEqual(
      [...data.flights.keys()].sort(),
    );
    for (const [key, flight] of own.flights) {
      expect(flight.seats).toBe(data.flights.get(key)?.seats);
    }
  });

  it('берёт названия городов из названия маршрута', () => {
    expect(routeOf('MOW-AER')).toMatchObject({
      origin: 'MOW',
      originName: 'Москва',
      destination: 'AER',
      destinationName: 'Сочи',
    });
    expect(routeOf('MOW-MRV').destinationName).toBe('Минеральные Воды');
  });

  describe('битые файлы', () => {
    let dir: string;
    const routesHeader =
      'route,name,base_price,cost_per_passenger,price_sensitivity,price_min,price_max';
    const routeRow = 'MOW-AER,Москва — Сочи,9000,4200,0.141,5400,18000';
    const forecastHeader = [
      'route',
      'date',
      'seats',
      ...FORECAST_QUANTILES.map((q) => `${q}_base_demand`),
    ].join(',');
    const demand = '600,650,700,720,750,780,800,850,900';

    const write = (name: string, lines: string[]) => {
      const path = join(dir, name);
      writeFileSync(path, lines.join('\n'));
      return path;
    };

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'forecast-'));
    });
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it('не находит файл', () => {
      const routes = write('routes.csv', [routesHeader, routeRow]);
      expect(() =>
        loadForecastData({ routes, forecast: join(dir, 'nope.csv') }),
      ).toThrow(/nope\.csv: файл не найден/);
    });

    it('называет недостающие столбцы', () => {
      const routes = write('routes.csv', [routesHeader, routeRow]);
      const forecast = write('f.csv', [
        'route,date,seats,0.5_base_demand',
        'MOW-AER,2026-06-01,900,700',
      ]);
      expect(() => loadForecastData({ routes, forecast })).toThrow(
        /нет столбцов 0\.1_base_demand/,
      );
    });

    it('называет строку с битым числом', () => {
      const routes = write('routes.csv', [routesHeader, routeRow]);
      const forecast = write('f.csv', [
        forecastHeader,
        `MOW-AER,2026-06-01,900,${demand}`,
        `MOW-AER,2026-06-02,много,${demand}`,
      ]);
      expect(() => loadForecastData({ routes, forecast })).toThrow(
        ForecastDataError,
      );
      expect(() => loadForecastData({ routes, forecast })).toThrow(
        /строка 3: в seats не число/,
      );
    });

    it('не пускает рейс неизвестного маршрута и несуществующую дату', () => {
      const routes = write('routes.csv', [routesHeader, routeRow]);
      const unknown = write('a.csv', [
        forecastHeader,
        `MOW-LED,2026-06-01,900,${demand}`,
      ]);
      expect(() => loadForecastData({ routes, forecast: unknown })).toThrow(
        /маршрута MOW-LED нет в routes\.csv/,
      );
      const badDate = write('b.csv', [
        forecastHeader,
        `MOW-AER,2026-06-31,900,${demand}`,
      ]);
      expect(() => loadForecastData({ routes, forecast: badDate })).toThrow(
        /дата «2026-06-31»/,
      );
    });
  });
});

describe('parseCsv', () => {
  it('понимает кавычки, CRLF, BOM и пустые строки', () => {
    expect(parseCsv('\uFEFFa,b\r\n"x, y","say ""hi"""\r\n\r\n1,2\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['1', '2'],
    ]);
  });
});
