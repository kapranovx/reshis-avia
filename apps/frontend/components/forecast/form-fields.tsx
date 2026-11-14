'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { RouteInfo } from '@reshis-avia/shared';
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
          <p className="mt-1 text-[15px]">{route.originName}</p>
        </div>
      )}

      <fieldset>
        <legend className="text-sm font-medium">Куда</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {destinations.map((r) => (
            <label key={r.route} className="relative">
              <input
                type="radio"
                name="destination"
                value={r.destination}
                checked={r.route === route.route}
                onChange={() => onChange(r)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'inline-flex h-9 cursor-pointer items-center rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm transition-colors pointer-coarse:h-10',
                  'hover:bg-[var(--color-surface-hover)]',
                  'peer-checked:border-[var(--color-accent)] peer-checked:bg-[var(--color-accent-subtle)] peer-checked:text-[var(--color-accent)] peer-checked:shadow-[inset_0_0_0_1px_var(--color-accent)]',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-accent)]',
                )}
              >
                {r.destinationName}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

export function DateField({
  value,
  route,
  onChange,
}: {
  value: string;
  route: RouteInfo;
  onChange: (isoDate: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const first = isoToLocalDate(route.dateFrom);
  const last = isoToLocalDate(route.dateTo);

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
            <Calendar
              mode="single"
              required
              autoFocus
              selected={isoToLocalDate(value)}
              defaultMonth={isoToLocalDate(value)}
              startMonth={first}
              endMonth={last}
              disabled={[{ before: first }, { after: last }]}
              onSelect={(date) => {
                if (!date) return;
                onChange(localDateToIso(date));
                setOpen(false);
              }}
            />
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
