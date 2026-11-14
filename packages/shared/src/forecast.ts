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
}
