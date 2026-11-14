import { TriangleAlert } from 'lucide-react';
import type { Forecast } from '@reshis-avia/shared';
import {
  formatDay,
  formatNumber,
  formatPeople,
  formatRubles,
  plural,
  roundPeople,
} from '@/lib/format';

const SEATS = ['места', 'мест', 'мест'] as const;
const PEOPLE = ['человека', 'человека', 'человек'] as const;

export function ForecastResult({
  forecast,
  updating,
  heroRef,
}: {
  forecast: Forecast;
  updating: boolean;
  heroRef?: React.Ref<HTMLDivElement>;
}) {
  const sales = roundPeople(forecast.simple.sales);
  const unmet = Math.round(forecast.simple.wants - forecast.seats);
  const load = Math.min(100, Math.round((sales / forecast.seats) * 100));

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold tracking-[-0.01em]">
          {forecast.name}, {formatDay(forecast.date)}
        </h2>
        <p className="text-sm text-[var(--color-fg-muted)] tabular-nums">
          {updating
            ? 'Пересчитываем…'
            : `Билет ${formatRubles(forecast.price)}`}
        </p>
      </div>

      <div
        aria-live="polite"
        className="mt-5 grid gap-x-10 gap-y-5 sm:grid-cols-[minmax(0,1fr)_15rem] sm:items-end"
      >
        <div ref={heroRef}>
          <p className="text-sm text-[var(--color-fg-muted)]">
            Купят (прогноз продаж)
          </p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2.5">
            <span className="text-5xl leading-none font-semibold tracking-[-0.03em] tabular-nums">
              {formatNumber(sales)}
            </span>
            <span className="text-lg text-[var(--color-fg-muted)]">
              из {formatNumber(forecast.seats)}{' '}
              {plural(forecast.seats, [...SEATS])}
            </span>
          </p>
          <div
            role="meter"
            aria-label="Загрузка рейса"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={load}
            aria-valuetext={`${load}%`}
            className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--color-accent-track)]"
          >
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${load}%` }}
            />
          </div>
          <p className="mt-1.5 text-sm text-[var(--color-fg-muted)] tabular-nums">
            Загрузка рейса {load}%
          </p>
        </div>

        <dl className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)] text-sm">
          <Fact
            label="Хотят купить (медиана)"
            value={formatPeople(forecast.simple.wants)}
          />
          <Fact label="Мест в самолёте" value={formatNumber(forecast.seats)} />
        </dl>
      </div>

      {(forecast.limitedBySeats || forecast.priceOutOfRange) && (
        <div className="mt-5 space-y-2">
          {forecast.limitedBySeats && (
            <Notice>
              Продажи упираются в число мест
              {unmet >= 1
                ? `: желающих на ${formatNumber(unmet)} ${plural(unmet, [...PEOPLE])} больше, чем мест в самолёте.`
                : '.'}
            </Notice>
          )}
          {forecast.priceOutOfRange && (
            <Notice>
              Цена вне обычного диапазона маршрута:{' '}
              <span className="whitespace-nowrap">
                {formatNumber(forecast.priceMin)}–
                {formatRubles(forecast.priceMax)}
              </span>
              .
            </Notice>
          )}
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-[var(--color-fg-muted)]">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-warning)]/40 bg-[var(--color-warning-subtle)] px-3 py-2.5 text-sm">
      <TriangleAlert
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-[var(--color-warning)]"
      />
      <span>{children}</span>
    </p>
  );
}
