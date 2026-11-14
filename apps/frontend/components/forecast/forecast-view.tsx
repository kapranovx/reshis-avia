'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import {
  NEXT_PARAM,
  type Forecast,
  type ForecastQuery,
  type RouteInfo,
} from '@reshis-avia/shared';
import { authApi } from '@/lib/api/auth';
import { ApiError, messageOf } from '@/lib/api/client';
import { forecastApi } from '@/lib/api/forecast';
import { cn } from '@/lib/cn';
import { formatNumber, plural, roundPeople } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { DemandChart } from './demand-chart';
import { ForecastResult } from './forecast-result';
import { DateField, PriceField, RoutePicker } from './form-fields';

interface FormState {
  route: string;
  date: string;
  price: string;
}

// Первый расчёт сразу по значениям формы, дальше с паузой на ввод.
const LIVE_DELAY_MS = 300;

function formFor(route: RouteInfo, date = route.dateFrom): FormState {
  return {
    route: route.route,
    date: clampDate(date, route),
    price: String(route.basePrice),
  };
}

function clampDate(date: string, route: RouteInfo): string {
  if (!date || date < route.dateFrom) return route.dateFrom;
  if (date > route.dateTo) return route.dateTo;
  return date;
}

function toQuery(form: FormState, route: RouteInfo): ForecastQuery | string {
  if (form.price.trim() === '') return 'Укажите цену билета';
  const price = Number(form.price);
  if (!Number.isFinite(price)) return 'Укажите цену числом';
  if (price <= 0) return 'Цена должна быть больше нуля';
  return {
    origin: route.origin,
    destination: route.destination,
    date: form.date,
    price,
  };
}

function usePrefersReducedMotion(): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => true,
  );
}

export function ForecastView() {
  const router = useRouter();
  const reducedMotion = usePrefersReducedMotion();
  const [routes, setRoutes] = React.useState<RouteInfo[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  const [form, setForm] = React.useState<FormState | null>(null);
  const [result, setResult] = React.useState<Forecast | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const requestRef = React.useRef<AbortController | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = React.useRef(false);
  const resultRef = React.useRef<HTMLElement | null>(null);
  const heroRef = React.useRef<HTMLDivElement | null>(null);
  const [heroBelow, setHeroBelow] = React.useState(false);

  const toLogin = React.useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    router.replace(`/login?${NEXT_PARAM}=${encodeURIComponent('/app')}`);
  }, [router]);

  React.useEffect(() => {
    let cancelled = false;
    forecastApi.routes().then(
      (list) => {
        if (cancelled) return;
        setRoutes(list);
        setForm((current) => current ?? (list[0] ? formFor(list[0]) : null));
      },
      (err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          void toLogin();
          return;
        }
        setLoadError(messageOf(err));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt, toLogin]);

  const route = routes?.find((r) => r.route === form?.route) ?? null;
  const query = React.useMemo(
    () => (form && route ? toQuery(form, route) : null),
    [form, route],
  );

  const calculate = React.useCallback(
    async (query: ForecastQuery | string) => {
      if (typeof query === 'string') {
        requestRef.current?.abort();
        setPending(false);
        setError(query);
        return;
      }

      // Новый запрос отменяет прошлый, чтобы поздний ответ не перетёр свежий.
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      setPending(true);
      setError(null);

      try {
        const forecast = await forecastApi.forecast(query, controller.signal);
        if (controller.signal.aborted) return;
        setResult(forecast);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          void toLogin();
          return;
        }
        setError(messageOf(err));
      } finally {
        if (requestRef.current === controller) {
          requestRef.current = null;
          setPending(false);
        }
      }
    },
    [toLogin],
  );

  React.useEffect(() => {
    if (!query) return;
    const delay = startedRef.current ? LIVE_DELAY_MS : 0;
    startedRef.current = true;
    const timer = setTimeout(() => void calculate(query), delay);
    timerRef.current = timer;
    return () => {
      clearTimeout(timer);
      // Отменяем сразу при изменении формы, включая паузу перед новым запросом.
      requestRef.current?.abort();
    };
  }, [query, calculate]);

  React.useEffect(() => () => requestRef.current?.abort(), []);

  // На телефоне результат под формой. Пока главное число ниже экрана,
  // внизу висит строка с ним. Отступ снизу равен высоте этой строки.
  const hasResult = result !== null;
  React.useEffect(() => {
    const element = heroRef.current;
    if (!element || !hasResult) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setHeroBelow(
          entry.intersectionRatio < 1 && entry.boundingClientRect.top > 0,
        );
      },
      { threshold: [0, 1], rootMargin: '0px 0px -72px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasResult]);

  if (loadError) {
    return (
      <Panel>
        <p className="text-[var(--color-fg-muted)]">{loadError}</p>
        <Button
          className="mt-4"
          onClick={() => {
            setLoadError(null);
            setAttempt((n) => n + 1);
          }}
        >
          Попробовать снова
        </Button>
      </Panel>
    );
  }

  if (!routes || !form || !route) {
    return (
      <Panel>
        <p className="text-sm text-[var(--color-fg-subtle)]">
          {routes ? 'В данных нет ни одного маршрута' : 'Загружаем маршруты…'}
        </p>
      </Panel>
    );
  }

  const update = (patch: Partial<FormState>) =>
    setForm((f) => f && { ...f, ...patch });
  const inputError = typeof query === 'string' ? query : null;
  const visibleError = inputError ?? error;
  const stale = Boolean(
    result &&
    (result.route !== form.route ||
      result.date !== form.date ||
      result.price !== Number(form.price)),
  );
  const updating = !visibleError && (pending || stale);

  return (
    <div className="pb-20 lg:pb-0">
      <h1 className="sr-only">Прогноз продаж</h1>

      <div className="grid gap-6 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start">
        <form
          noValidate
          aria-label="Параметры рейса"
          onSubmit={(event) => {
            event.preventDefault();
            if (timerRef.current !== null) clearTimeout(timerRef.current);
            void calculate(toQuery(form, route));
          }}
          className="min-w-0 space-y-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 lg:sticky lg:top-24"
        >
          <RoutePicker
            routes={routes}
            route={route}
            onChange={(next) => setForm((f) => f && formFor(next, f.date))}
          />
          <DateField
            value={form.date}
            route={route}
            onChange={(date) => update({ date })}
          />
          <PriceField
            value={form.price}
            route={route}
            onChange={(price) => update({ price })}
            invalid={Boolean(inputError)}
          />

          {visibleError ? (
            <div className="space-y-2">
              <p
                id="forecast-error"
                role="alert"
                className="text-sm text-[var(--color-danger)]"
              >
                {visibleError}
              </p>
              {!inputError && (
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                >
                  Повторить расчёт
                </Button>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-fg-subtle)]">
              Прогноз пересчитывается сразу при каждом изменении.
            </p>
          )}
        </form>

        <section
          ref={resultRef}
          aria-label="Результат прогноза"
          aria-busy={updating}
          className={cn(
            'min-w-0 scroll-mt-24 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-opacity motion-reduce:transition-none sm:p-6',
            // Форма с ошибкой: цифры относятся к прошлому расчёту.
            visibleError && result && 'opacity-50',
          )}
        >
          {result ? (
            <>
              <ForecastResult
                forecast={result}
                updating={updating}
                heroRef={heroRef}
              />
              <div className="mt-6 border-t border-[var(--color-border)] pt-6">
                <DemandChart forecast={result} />
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--color-fg-subtle)]">
              {visibleError
                ? 'Прогноз появится после успешного расчёта.'
                : 'Считаем прогноз…'}
            </p>
          )}
        </section>
      </div>

      {result && heroBelow && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() =>
              resultRef.current?.scrollIntoView({
                behavior: reducedMotion ? 'auto' : 'smooth',
                block: 'start',
              })
            }
            className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
          >
            <span className="text-sm text-[var(--color-fg-muted)]">
              {visibleError ? (
                'Проверьте параметры'
              ) : updating ? (
                'Пересчитываем…'
              ) : (
                <>
                  Купят{' '}
                  <span className="text-lg font-semibold text-[var(--color-fg)] tabular-nums">
                    {formatNumber(roundPeople(result.simple.sales))}
                  </span>{' '}
                  из {formatNumber(result.seats)}{' '}
                  {plural(result.seats, ['места', 'мест', 'мест'])}
                </>
              )}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-medium text-[var(--color-accent)]">
              К результату
              <ChevronDown aria-hidden className="size-4" />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6">
      {children}
    </div>
  );
}
