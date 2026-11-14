import type { Forecast, ForecastQuery, RouteInfo } from '@reshis-avia/shared';
import { apiFetch } from './client';

export const forecastApi = {
  routes: (): Promise<RouteInfo[]> => apiFetch<RouteInfo[]>('/routes'),

  forecast: (query: ForecastQuery, signal?: AbortSignal): Promise<Forecast> => {
    const params = new URLSearchParams({
      origin: query.origin,
      destination: query.destination,
      date: query.date,
      price: String(query.price),
    });
    return apiFetch<Forecast>(`/forecast?${params}`, { signal });
  },
};
