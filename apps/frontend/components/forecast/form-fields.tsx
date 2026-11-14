'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DayButtonProps, Modifiers } from 'react-day-picker';
import type { ForecastDay, RouteInfo } from '@reshis-avia/shared';
import { forecastApi } from '@/lib/api/forecast';
import { cn } from '@/lib/cn';
import { isoToLocalDate, localDateToIso, shiftIsoDate } from '@/lib/dates';
import { formatDay, formatDayWithWeekday, formatRubles } from '@/lib/format';
import { Calendar } from '@/components/ui/calendar';
import { Field, Input, Label } from '@/components/ui/field';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Select } from '@/components/ui/select';

const SLIDER_STEP = 100;
const PRICE = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 20 });

const CONTROL =
  'rounded-[var(--radius-md)] border border-[var(--color-input-border)] bg-[var(--color-surface)] text-[var(--color-fg)] transition-colors hover:bg-[var(--color-surface-hover)]';

export function RoutePicker({
  routes,
  route,
  onChange,
}: {
  routes: RouteInfo[];
  route: RouteInfo;
  onChange: (next: RouteInfo) => void;
}) {
  const origins = [
    ...new Map(routes.map((r) => [r.origin, r.originName])).entries(),
  ];
  const destinations = routes.filter((r) => r.origin === route.origin);

  return (
    <>
      {/* Пока город отправления один, список из одного пункта только мешает. */}
      {origins.length > 1 ? (
        <Field id="origin" label="Откуда">
          <Select
            value={route.origin}
            onChange={(e) => {
              const next = routes.find((r) => r.origin === e.target.value);
              if (next) onChange(next);
            }}
          >
            {origins.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <div>
          <p className="text-sm font-medium">Откуда</p>
          <p className="mt-1.5 flex h-10 items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] px-3 text-[15px]">
            <AirportCode>{route.origin}</AirportCode>
            {route.originName}
          </p>
        </div>
      )}

      <fieldset>
        <legend className="text-sm font-medium">Куда</legend>
        <div className="mt-1.5 grid gap-1.5">
          {destinations.map((r) => (
            <label key={r.route} className="relative block">
              <input
                type="radio"
                name="destination"
                value={r.destination}
                checked={r.route === route.route}
                onChange={() => onChange(r)}
                className="peer sr-only"
              />
              {/* Выбранное направление как указатель в аэропорту: тёмное на жёлтом. */}
              <span
                className={cn(
                  'flex h-10 cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-[15px] transition-colors pointer-coarse:h-11',
                  // Наведение заранее показывает цвет выбора: тёмная заливка в тёмной теме сливалась с панелью.
                  'hover:border-[var(--color-signal)] hover:bg-[var(--color-accent-subtle)]',
                  'peer-checked:border-[var(--color-signal)] peer-checked:bg-[var(--color-signal)] peer-checked:font-medium peer-checked:text-[var(--color-signal-fg)]',
                  // Выбранная строка при наведении остаётся жёлтой: селектор с :checked и :hover сильнее простого :hover.
                  'peer-checked:hover:border-[var(--color-signal-hover)] peer-checked:hover:bg-[var(--color-signal-hover)]',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-accent)]',
                )}
              >
                <AirportCode>{r.destination}</AirportCode>
                {r.destinationName}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

// Код аэропорта IATA, как на посадочном талоне. Чтецу хватает названия города.
function AirportCode({ children }: { children: string }) {
  return (
    <span
      aria-hidden
      className="w-9 shrink-0 font-[family-name:var(--font-display)] text-lg leading-none font-semibold tracking-[0.06em]">
      {children}
    </span>
  );
}

// Загрузка рейсов по датам при текущей цене, для полос в календаре.
// Запрашивается, только пока календарь открыт. Ошибка не мешает выбрать дату:
// календарь просто остаётся без полос.
function useDayLoads(
  open: boolean,
  route: RouteInfo,
  price: number | null,
): Map<string, ForecastDay> | null {
  const key = price === null ? null : `${route.route}|${price}`;
  const [loaded, setLoaded] = React.useState<{
    key: string;
    days: Map<string, ForecastDay>;
  } | null>(null);

  React.useEffect(() => {
    if (!open || key === null || price === null || loaded?.key === key) return;
    const controller = new AbortController();
    forecastApi
      .calendar(
        { origin: route.origin, destination: route.destination, price },
        controller.signal,
      )
      .then(
        (list) =>
          setLoaded({ key, days: new Map(list.map((d) => [d.date, d])) }),
        () => undefined,
      );
    return () => controller.abort();
  }, [open, key, price, route.origin, route.destination, loaded?.key]);

  return loaded?.key === key ? loaded.days : null;
}

// Через контекст, а не через замыкание: компонент дня должен быть одним и тем
// же, иначе DayPicker пересоздаёт кнопки и теряет фокус.
const DayLoadsContext = React.createContext<Map<string, ForecastDay> | null>(
  null,
);

// Кнопка дня с тонкой полосой загрузки под числом. Оранжевая — мест не хватит.
function LoadDayButton({ day, modifiers, children, ...props }: DayButtonProps) {
  const loads = React.useContext(DayLoadsContext);
  const info = modifiers.disabled
    ? undefined
    : loads?.get(localDateToIso(day.date));
  const load = info ? Math.min(1, info.sales / info.seats) : 0;

  return (
    <button {...props} className={cn(props.className, 'relative')}>
      {children}
      {info && (
        <span
          aria-hidden
          className="absolute inset-x-[24%] bottom-[5px] h-[3px] overflow-hidden rounded-full"
        >
          <span className="absolute inset-0 bg-current opacity-20" />
          <span
            className={cn(
              'absolute inset-y-0 left-0 rounded-full',
              info.limitedBySeats && !modifiers.selected
                ? 'bg-[var(--color-chart-over)]'
                : 'bg-current',
            )}
            style={{ width: `${load * 100}%` }}
          />
        </span>
      )}
    </button>
  );
}

const DAY_COMPONENTS = { DayButton: LoadDayButton };

export function DateField({
  value,
  route,
  price,
  onChange,
}: {
  value: string;
  route: RouteInfo;
  // Цена из формы. Без неё календарь показывается без загрузки.
  price: number | null;
  onChange: (isoDate: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const loads = useDayLoads(open, route, price);
  const first = isoToLocalDate(route.dateFrom);
  const last = isoToLocalDate(route.dateTo);

  const dayLabel = (date: Date, modifiers: Modifiers) => {
    const iso = localDateToIso(date);
    const info = modifiers.disabled ? undefined : loads?.get(iso);
    const parts = [formatDayWithWeekday(iso)];
    if (modifiers.selected) parts.push('выбрана');
    if (info) {
      parts.push(
        info.limitedBySeats
          ? 'мест не хватит'
          : `загрузка ${Math.round((info.sales / info.seats) * 100)}%`,
      );
    }
    return parts.join(', ');
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor="date" id="date-label">
        Дата вылета
      </Label>
      <div className="flex gap-1.5">
        <StepButton
          label="Предыдущий день"
          disabled={value <= route.dateFrom}
          onClick={() => onChange(shiftIsoDate(value, -1))}
        >
          <ChevronLeft />
        </StepButton>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              id="date"
              type="button"
              aria-labelledby="date-label date-value"
              aria-describedby="date-hint"
              className={cn(
                CONTROL,
                'flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center px-2 text-[15px] tabular-nums',
              )}
            >
              <span id="date-value" className="text-center leading-tight">
                {formatDayWithWeekday(value)}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent aria-labelledby="date-label">
            <DayLoadsContext value={loads}>
              <Calendar
                mode="single"
                required
                autoFocus
                selected={isoToLocalDate(value)}
                defaultMonth={isoToLocalDate(value)}
                startMonth={first}
                endMonth={last}
                disabled={[{ before: first }, { after: last }]}
                components={DAY_COMPONENTS}
                labels={{ labelDayButton: dayLabel }}
                onSelect={(date) => {
                  if (!date) return;
                  onChange(localDateToIso(date));
                  setOpen(false);
                }}
              />
            </DayLoadsContext>
            {loads && price !== null && (
              <p className="max-w-[18.5rem] border-t border-[var(--color-border)] px-3 py-2.5 text-xs leading-relaxed text-[var(--color-fg-muted)]">
                Полоса под датой — загрузка рейса при цене{' '}
                <span className="whitespace-nowrap">{formatRubles(price)}</span>.
                {[...loads.values()].some((d) => d.limitedBySeats) &&
                  ' Оранжевая — мест не хватит всем желающим.'}
              </p>
            )}
          </PopoverContent>
        </Popover>
        <StepButton
          label="Следующий день"
          disabled={value >= route.dateTo}
          onClick={() => onChange(shiftIsoDate(value, 1))}
        >
          <ChevronRight />
        </StepButton>
      </div>
      <p id="date-hint" className="text-xs text-[var(--color-fg-subtle)]">
        Рейсы с {formatDay(route.dateFrom)} по {formatDay(route.dateTo)}
      </p>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        CONTROL,
        'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center text-[var(--color-fg-muted)] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4',
      )}
    >
      {children}
    </button>
  );
}

export function PriceField({
  value,
  route,
  onChange,
  invalid = false,
}: {
  value: string;
  route: RouteInfo;
  onChange: (price: string) => void;
  invalid?: boolean;
}) {
  const [editing, setEditing] = React.useState<{
    raw: string;
    text: string;
  } | null>(null);
  const typed = value.trim() === '' ? NaN : Number(value);
  const slider = Number.isFinite(typed)
    ? Math.min(route.priceMax, Math.max(route.priceMin, typed))
    : route.basePrice;
  const fill =
    ((slider - route.priceMin) / (route.priceMax - route.priceMin)) * 100;

  return (
    <div className="space-y-1.5">
      <Label htmlFor="price">Цена билета</Label>
      <div className="relative">
        <Input
          id="price"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={
            editing?.raw === value
              ? editing.text
              : Number.isFinite(typed)
                ? PRICE.format(typed)
                : value
          }
          aria-invalid={invalid || undefined}
          aria-describedby={`price-range price-base${invalid ? ' forecast-error' : ''}`}
          onBlur={() => setEditing(null)}
          onChange={(e) => {
            const text = e.target.value;
            const raw = text.replace(/[\s₽]/g, '').replace(',', '.');
            setEditing({ raw, text });
            onChange(raw);
          }}
          onKeyDown={(e) => {
            if (
              (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
              Number.isFinite(typed)
            ) {
              e.preventDefault();
              onChange(
                String(Math.max(1, typed + (e.key === 'ArrowUp' ? 1 : -1))),
              );
            }
          }}
          className="pr-9 tabular-nums"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[15px] text-[var(--color-fg-muted)]"
        >
          ₽
        </span>
      </div>
      <input
        type="range"
        aria-label="Цена билета"
        aria-valuetext={formatRubles(slider)}
        aria-describedby="price-range"
        min={route.priceMin}
        max={route.priceMax}
        step={SLIDER_STEP}
        value={slider}
        onChange={(e) => onChange(e.target.value)}
        style={{ '--fill': `${fill}%` } as React.CSSProperties}
        className="range block w-full"
      />
      <p
        id="price-range"
        className="flex justify-between text-xs text-[var(--color-fg-subtle)] tabular-nums"
      >
        <span className="sr-only">Обычный диапазон маршрута:</span>
        <span>{formatRubles(route.priceMin)}</span>
        <span>{formatRubles(route.priceMax)}</span>
      </p>
      <p id="price-base" className="text-xs text-[var(--color-fg-subtle)]">
        Базовая цена {formatRubles(route.basePrice)}
        {typed !== route.basePrice && (
          <>
            {' '}
            <button
              type="button"
              onClick={() => onChange(String(route.basePrice))}
              className="cursor-pointer text-[var(--color-accent)] underline underline-offset-2"
            >
              вернуть
            </button>
          </>
        )}
      </p>
    </div>
  );
}
