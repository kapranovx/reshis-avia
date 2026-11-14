// Контракт прогноза продаж: /routes и /forecast.

// Сценарии спроса из файла прогноза, от пессимистичного к оптимистичному.
export const FORECAST_QUANTILES = [
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9,
] as const;

export const MEDIAN_QUANTILE = 0.5;

export interface RouteInfo {
  route: string;
  name: string;
  origin: string;
  originName: string;
  destination: string;
  destinationName: string;
  basePrice: number;
  priceMin: number;
  priceMax: number;
  dateFrom: string;
  dateTo: string;
}

export interface ForecastQuery {
  origin: string;
  destination: string;
  // YYYY-MM-DD
  date: string;
  price: number;
}

// Календарь загрузки: те же маршрут и цена, но на все даты рейсов.
export type ForecastCalendarQuery = Omit<ForecastQuery, 'date'>;

// Прогноз на одну дату по медиане, для календаря.
export interface ForecastDay {
  date: string;
  seats: number;
  wants: number;
  sales: number;
  limitedBySeats: boolean;
}

// Деньги рейса по медиане. Маржинальная прибыль — выручка минус затраты на
// пассажиров из routes.csv. Затрат на сам перелёт в routes.csv нет. На выбор
// лучшей цены они бы и не повлияли: от числа пассажиров они не зависят.
export interface ForecastPricing {
  costPerPassenger: number;
  margin: number;
  // Цена с наибольшей маржинальной прибылью в обычном диапазоне маршрута,
  // в целых рублях.
  bestPrice: number;
  bestSales: number;
  bestMargin: number;
}

export interface ForecastScenario {
  quantile: number;
  wants: number;
  sales: number;
  limitedBySeats: boolean;
}

// Числа без округления, до целых людей округляет интерфейс.
export interface Forecast {
  route: string;
  name: string;
  date: string;
  seats: number;
  price: number;
  basePrice: number;
  priceSensitivity: number;
  priceMin: number;
  priceMax: number;
  priceOutOfRange: boolean;
  simple: { wants: number; sales: number };
  scenarios: ForecastScenario[];
  limitedBySeats: boolean;
  pricing: ForecastPricing;
}
