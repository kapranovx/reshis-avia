import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Forecast, ForecastQuery, RouteInfo } from '@reshis-avia/shared';
import { calculateForecast } from './forecast.calc';
import {
  flightKey,
  type ForecastData,
  type RouteParams,
} from './forecast.data';

export const FORECAST_DATA = Symbol('FORECAST_DATA');

@Injectable()
export class ForecastService {
  private readonly byRoute: Map<string, RouteParams>;
  private readonly routeList: RouteInfo[];

  constructor(@Inject(FORECAST_DATA) private readonly data: ForecastData) {
    this.byRoute = new Map(data.routes.map((r) => [r.route, r]));
    this.routeList = data.routes.map((r) => {
      const range = data.dateRange.get(r.route)!;
      return {
        route: r.route,
        name: r.name,
        origin: r.origin,
        originName: r.originName,
        destination: r.destination,
        destinationName: r.destinationName,
        basePrice: r.basePrice,
        priceMin: r.priceMin,
        priceMax: r.priceMax,
        dateFrom: range.from,
        dateTo: range.to,
      };
    });
  }

  routes(): RouteInfo[] {
    return this.routeList;
  }

  forecast(query: ForecastQuery): Forecast {
    const route = this.byRoute.get(`${query.origin}-${query.destination}`);
    if (!route) throw new NotFoundException('Маршрут не найден');

    const flight = this.data.flights.get(flightKey(route.route, query.date));
    if (!flight) throw new NotFoundException('На эту дату рейса нет');

    return calculateForecast(route, flight, query.price);
  }
}
