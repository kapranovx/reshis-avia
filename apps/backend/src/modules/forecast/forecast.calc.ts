import {
  FORECAST_QUANTILES,
  MEDIAN_QUANTILE,
  type Forecast,
  type ForecastDay,
  type ForecastPricing,
  type ForecastScenario,
} from '@reshis-avia/shared';
import type { FlightRow, RouteParams } from './forecast.data';

// Формула кейса: спрос падает линейно от базовой цены.
export function wantsAt(
  baseDemand: number,
  route: Pick<RouteParams, 'basePrice' | 'priceSensitivity'>,
  price: number,
): number {
  return baseDemand - route.priceSensitivity * (price - route.basePrice);
}

export function salesOf(wants: number, seats: number): number {
  return Math.min(seats, Math.max(0, wants));
}

// Маржинальная прибыль: выручка минус затраты на пассажиров.
export function marginAt(price: number, sales: number, cost: number): number {
  return (price - cost) * sales;
}

// Цена с наибольшей маржинальной прибылью при данном спросе, в целых рублях
// внутри обычного диапазона маршрута. Пока желающих не меньше, чем мест,
// продажи постоянны и прибыль растёт с ценой. Дальше прибыль — парабола с
// вершиной в (спрос / чувствительность + базовая цена + затраты) / 2.
// Поэтому максимум — в большей из двух точек, если она в диапазоне, иначе
// на его краю.
export function bestPriceOf(
  route: RouteParams,
  baseDemand: number,
  seats: number,
): number {
  const low = Math.ceil(route.priceMin);
  const high = Math.floor(route.priceMax);
  const clamp = (p: number) => Math.min(high, Math.max(low, p));
  const margin = (p: number) =>
    marginAt(
      p,
      salesOf(wantsAt(baseDemand, route, p), seats),
      route.costPerPassenger,
    );

  const candidates = [low, high];
  const s = route.priceSensitivity;
  if (s > 0) {
    const vertex =
      (baseDemand / s + route.basePrice + route.costPerPassenger) / 2;
    const fullCabin = route.basePrice + (baseDemand - seats) / s;
    const peak = clamp(Math.max(vertex, fullCabin));
    candidates.push(clamp(Math.floor(peak)), clamp(Math.ceil(peak)));
  }
  // При равной прибыли — меньшая цена: билет купит больше людей.
  return candidates.reduce((best, p) =>
    margin(p) > margin(best) || (margin(p) === margin(best) && p < best)
      ? p
      : best,
  );
}

function pricingOf(
  route: RouteParams,
  flight: FlightRow,
  price: number,
  sales: number,
): ForecastPricing {
  const median = flight.baseDemand[MEDIAN_QUANTILE];
  const cost = route.costPerPassenger;
  const bestPrice = bestPriceOf(route, median, flight.seats);
  const bestSales = salesOf(wantsAt(median, route, bestPrice), flight.seats);
  return {
    costPerPassenger: cost,
    margin: marginAt(price, sales, cost),
    bestPrice,
    bestSales,
    bestMargin: marginAt(bestPrice, bestSales, cost),
  };
}

export function calculateForecast(
  route: RouteParams,
  flight: FlightRow,
  price: number,
): Forecast {
  const scenarios: ForecastScenario[] = FORECAST_QUANTILES.map((quantile) => {
    const wants = wantsAt(flight.baseDemand[quantile], route, price);
    return {
      quantile,
      wants,
      sales: salesOf(wants, flight.seats),
      limitedBySeats: wants > flight.seats,
    };
  });

  // Медиана считается той же формулой, поэтому совпадает со сценарием 0.5.
  const wants = wantsAt(flight.baseDemand[MEDIAN_QUANTILE], route, price);
  const sales = salesOf(wants, flight.seats);

  return {
    route: route.route,
    name: route.name,
    date: flight.date,
    seats: flight.seats,
    price,
    basePrice: route.basePrice,
    priceSensitivity: route.priceSensitivity,
    priceMin: route.priceMin,
    priceMax: route.priceMax,
    priceOutOfRange: price < route.priceMin || price > route.priceMax,
    simple: { wants, sales },
    scenarios,
    limitedBySeats: wants > flight.seats,
    pricing: pricingOf(route, flight, price, sales),
  };
}

// Прогноз на одну дату по медиане, для календаря загрузки.
export function calculateDay(
  route: RouteParams,
  flight: FlightRow,
  price: number,
): ForecastDay {
  const wants = wantsAt(flight.baseDemand[MEDIAN_QUANTILE], route, price);
  return {
    date: flight.date,
    seats: flight.seats,
    wants,
    sales: salesOf(wants, flight.seats),
    limitedBySeats: wants > flight.seats,
  };
}
