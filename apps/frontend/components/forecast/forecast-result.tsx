import { Plane, TriangleAlert } from 'lucide-react';
import type { Forecast } from '@reshis-avia/shared';
import { Flap } from '@/components/ui/flap';
import { cn } from '@/lib/cn';
import {
  formatDay,
  formatDayWithWeekday,
  formatNumber,
  formatPeople,
  formatRubles,
  plural,
  roundPeople,
} from '@/lib/format';

const SEATS = ['места', 'мест', 'мест'] as const;
const PEOPLE = ['человека', 'человека', 'человек'] as const;
// Деления полосы загрузки, как ряды кресел в салоне.
const SEGMENTS = 30;

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
  const free = Math.max(0, forecast.seats - sales);
  const unmet = Math.round(forecast.simple.wants - forecast.seats);
  const load = Math.min(100, Math.round((sales / forecast.seats) * 100));
  const filled = Math.round((load / 100) * SEGMENTS);
  const [origin, destination] = forecast.route.split('-');
  const [originName, destinationName] = forecast.name.split(' — ');

  return (
    <div>
      {/* Шапка как на посадочном талоне: коды аэропортов, дата и цена. */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <h2>
          <span className="sr-only">
            {forecast.name}, {formatDay(forecast.date)}
          </span>
          <span aria-hidden className="flex items-start gap-3 sm:gap-4">
            <Airport code={origin} name={originName} />
            <Plane className="mt-3 size-6 shrink-0 text-[var(--color-signal)] sm:mt-4 sm:size-7" />
            <Airport code={destination} name={destinationName} />
          </span>
        </h2>
        <div className="text-sm sm:text-right">
          <p className="text-[var(--color-fg-muted)]">
            {formatDayWithWeekday(forecast.date)}
          </p>
          <p className="mt-0.5 font-medium tabular-nums">
            {updating ? 'Пересчитываем…' : `Билет ${formatRubles(forecast.price)}`}
          </p>
        </div>
      </div>

      <div
        ref={heroRef}
        aria-live="polite"
        className="mt-6 border-t border-[var(--color-border)] pt-6"
      >
        <p className="text-sm text-[var(--color-fg-muted)]">
          Купят, прогноз продаж
        </p>
        <p className="mt-2.5 flex flex-wrap items-end gap-x-4 gap-y-2">
          <span className="sr-only">{formatNumber(sales)}</span>
          <Flap
            text={String(sales)}
            length={String(forecast.seats).length}
            className={cn(
              'text-[3.5rem] transition-opacity sm:text-[4.5rem]',
              updating && 'opacity-60',
            )}
          />
          <span className="pb-1 text-lg text-[var(--color-fg-muted)]">
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
          className="mt-5 grid h-3 grid-cols-[repeat(30,minmax(0,1fr))] gap-[3px]"
        >
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span
              key={i}
              className={cn(
                'rounded-[1px] transition-colors duration-300 motion-reduce:transition-none',
                i < filled
                  ? 'bg-[var(--color-signal)]'
                  : 'bg-[var(--color-accent-track)]',
              )}
            />
          ))}
        </div>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)] tabular-nums">
          Загрузка рейса {load}%
        </p>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 border-y border-[var(--color-border)] py-4">
        <Fact
          label="Хотят купить (медиана)"
          value={formatPeople(forecast.simple.wants)}
        />
        {unmet >= 1 ? (
          <Fact
            label="Не хватит мест"
            value={formatNumber(unmet)}
            unit={plural(unmet, [...PEOPLE])}
            tone="over"
          />
        ) : (
          <Fact label="Свободно мест" value={formatNumber(free)} />
        )}
      </dl>

      {(forecast.limitedBySeats || forecast.priceOutOfRange) && (
        <div className="mt-4 space-y-2">
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

function Airport({ code, name }: { code: string; name: string }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="font-[family-name:var(--font-display)] text-[2.75rem] leading-none font-bold tracking-[0.04em] sm:text-5xl">
        {code}
      </span>
      <span className="mt-1 text-sm text-[var(--color-fg-muted)]">{name}</span>
    </span>
  );
}

function Fact({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'over';
}) {
  // Подпись может уйти на две строки, значения при этом стоят на одной линии.
  return (
    <div className="flex min-w-0 flex-col justify-between">
      <dt className="text-sm text-[var(--color-fg-muted)]">{label}</dt>
      <dd
        className={cn(
          'mt-1 font-[family-name:var(--font-display)] text-[1.75rem] leading-none font-semibold tabular-nums',
          tone === 'over' && 'text-[var(--color-chart-over)]',
        )}
      >
        {value}
        {unit && (
          <span className="ml-1.5 font-[family-name:var(--font-sans)] text-sm font-normal">
            {unit}
          </span>
        )}
      </dd>
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
