import {
  FORECAST_QUANTILES,
  MEDIAN_QUANTILE,
  type Forecast,
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
    simple: { wants, sales: salesOf(wants, flight.seats) },
    scenarios,
    limitedBySeats: wants > flight.seats,
  };
}
