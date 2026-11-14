import { formatNumber, formatRubles } from '@/lib/format';
import {
  CHART_COLOR,
  SEGMENT_GAP,
  columnPath,
} from '@/components/forecast/chart-encoding';

// Расчёт сервиса для MOW-AER на 2026-06-01 по цене 8 500 ₽ из
// data/seasonal_forecast.csv. Если подменить данные, пример нужно пересчитать.
const EXAMPLE = {
  route: 'Москва — Сочи, 1 июня',
  price: 8500,
  seats: 900,
  sales: 846,
  wants: [726.5, 764.5, 793.5, 812.5, 845.5, 872.5, 905.5, 933.5, 993.5],
};

const WIDTH = 300;
const BASELINE = 112;
const TOP = 6;
const MAX = 1000;
const BAR = 16;
const MEDIAN_INDEX = 4;

const scale = (value: number) => (value / MAX) * (BASELINE - TOP);

export function ForecastExample() {
  const { seats, wants } = EXAMPLE;
  const band = WIDTH / wants.length;
  const seatsY = BASELINE - scale(seats);
  const over = wants.filter((w) => w > seats).length;

  return (
    <figure className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <p className="font-medium">{EXAMPLE.route}</p>
      <p className="text-sm text-[var(--color-fg-muted)]">
        Пример при цене билета {formatRubles(EXAMPLE.price)}
      </p>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
        <span className="text-[var(--color-fg-muted)]">Купят</span>
        <span className="text-4xl leading-none font-semibold tracking-[-0.03em] tabular-nums">
          {formatNumber(EXAMPLE.sales)}
        </span>
        <span className="text-[var(--color-fg-muted)]">
          из {formatNumber(seats)} мест
        </span>
      </p>

      <svg
        viewBox={`0 0 ${WIDTH} ${BASELINE + 1}`}
        role="img"
        aria-label={`Спрос по девяти сценариям от ${formatNumber(Math.round(wants[0]))} до ${formatNumber(Math.round(wants[wants.length - 1]))} человек, мест ${formatNumber(seats)}`}
        className="mt-5 block w-full"
      >
        {wants.map((w, i) => {
          const x = i * band + (band - BAR) / 2;
          const salesHeight = scale(Math.min(w, seats));
          const unmetHeight = scale(Math.max(0, w - seats));
          const salesTop = BASELINE - salesHeight;
          return (
            <g key={i}>
              <path
                d={columnPath(x, salesTop, BAR, salesHeight, unmetHeight === 0)}
                fill={
                  i === MEDIAN_INDEX ? CHART_COLOR.median : CHART_COLOR.neutral
                }
              />
              {unmetHeight > 0 && (
                <path
                  d={columnPath(
                    x,
                    salesTop - unmetHeight,
                    BAR,
                    Math.max(1.5, unmetHeight - SEGMENT_GAP),
                    true,
                  )}
                  fill={CHART_COLOR.over}
                />
              )}
            </g>
          );
        })}
        <line
          x1={0}
          x2={WIDTH}
          y1={BASELINE + 0.5}
          y2={BASELINE + 0.5}
          stroke={CHART_COLOR.grid}
        />
        <line
          x1={0}
          x2={WIDTH}
          y1={seatsY}
          y2={seatsY}
          stroke={CHART_COLOR.seats}
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />
      </svg>

      <figcaption className="mt-3 text-sm text-[var(--color-fg-muted)]">
        Спрос по девяти сценариям, пунктир — места в самолёте. В {over} из 9
        сценариев мест не хватит всем желающим.
      </figcaption>
    </figure>
  );
}
