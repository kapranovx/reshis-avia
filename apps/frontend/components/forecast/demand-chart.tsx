'use client';

import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
  type TooltipContentProps,
  type XAxisTickContentProps,
} from 'recharts';
import { ChevronRight } from 'lucide-react';
import { MEDIAN_QUANTILE, type Forecast } from '@reshis-avia/shared';
import { cn } from '@/lib/cn';
import { formatNumber, formatPeople, formatRubles } from '@/lib/format';
import { CHART_COLOR, SEGMENT_GAP, columnPath } from './chart-encoding';

interface Point {
  // Подпись оси без знака процента, на телефоне иначе подписи слипаются.
  tick: string;
  label: string;
  wants: number;
  sales: number;
  unmet: number;
  median: boolean;
}

function toPoints(forecast: Forecast): Point[] {
  return forecast.scenarios.map((s) => {
    const percent = Math.round(s.quantile * 100);
    const wants = Math.max(0, s.wants);
    return {
      tick: String(percent),
      label: `${percent}%`,
      wants,
      sales: s.sales,
      unmet: Math.max(0, wants - forecast.seats),
      median: s.quantile === MEDIAN_QUANTILE,
    };
  });
}

function summary(points: Point[], price: number): string {
  if (points.every((p) => p.wants <= 0)) {
    return `При цене ${formatRubles(price)} билет не купят ни в одном сценарии`;
  }
  const over = points.filter((p) => p.unmet > 0).length;
  if (over === 0) return 'Во всех 9 сценариях мест хватит всем желающим';
  if (over === points.length) {
    return 'Во всех 9 сценариях мест не хватит всем желающим';
  }
  return `В ${over === 1 ? 'одном' : over} из 9 сценариев мест не хватит всем желающим`;
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

// Нижняя часть столбца: купят. Скругляется, только если сверху ничего нет.
function SalesShape({ x, y, width, height, payload }: BarShapeProps) {
  const point = payload as Point;
  if (!(height > 0)) return <g />;
  return (
    <path
      d={columnPath(x, y, width, height, point.unmet <= 0)}
      fill={point.median ? CHART_COLOR.median : CHART_COLOR.neutral}
    />
  );
}

// Верхняя часть: не хватит мест. Снизу просвет, чтобы части не слипались.
function UnmetShape({ x, y, width, height }: BarShapeProps) {
  if (!(height > 0)) return <g />;
  const visible = Math.max(1.5, height - SEGMENT_GAP);
  return (
    <path d={columnPath(x, y, width, visible, true)} fill={CHART_COLOR.over} />
  );
}

const MEDIAN_TICK = String(Math.round(MEDIAN_QUANTILE * 100));

function ScenarioTick({ x, y, payload }: XAxisTickContentProps) {
  const median = String(payload.value) === MEDIAN_TICK;
  return (
    <text
      x={x}
      y={y}
      dy={12}
      textAnchor="middle"
      fontSize={12}
      fontWeight={median ? 600 : 400}
      fill={median ? 'var(--color-fg)' : CHART_COLOR.axis}
    >
      {payload.value}
    </text>
  );
}

function ScenarioTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as Point | undefined;
  if (!active || !point) return null;
  return (
    <div className="min-w-48 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm shadow-[0_4px_16px_rgb(0_0_0/0.1)]">
      <p className="font-medium">
        Сценарий {point.label}
        {point.median && ', медиана'}
      </p>
      <dl className="mt-1.5 space-y-1 tabular-nums">
        <TooltipRow
          color={point.median ? CHART_COLOR.median : CHART_COLOR.neutral}
          label="Купят"
          value={formatPeople(point.sales)}
        />
        {point.unmet > 0 && (
          <TooltipRow
            color={CHART_COLOR.over}
            label="Не хватит мест"
            value={formatPeople(point.unmet)}
          />
        )}
        <TooltipRow label="Хотят купить" value={formatPeople(point.wants)} />
      </dl>
    </div>
  );
}

function TooltipRow({
  color,
  label,
  value,
}: {
  color?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="h-0.5 w-3 shrink-0 rounded-full"
        style={{ background: color ?? 'transparent' }}
      />
      <dt className="text-[var(--color-fg-muted)]">{label}</dt>
      <dd className="ml-auto pl-4 font-semibold">{value}</dd>
    </div>
  );
}

export function DemandChart({ forecast }: { forecast: Forecast }) {
  const reducedMotion = usePrefersReducedMotion();
  const { seats } = forecast;
  const points = toPoints(forecast);
  const empty = points.every((p) => p.wants <= 0);
  const hasUnmet = points.some((p) => p.unmet > 0);
  const animation = {
    isAnimationActive: !reducedMotion,
    animationDuration: 250,
  };

  return (
    <figure>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-base font-semibold">Распределение спроса</h3>
        <p className="text-xs text-[var(--color-fg-muted)]">
          Хотят купить, чел.
        </p>
      </div>

      <div className="relative mt-4 h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={points}
            margin={{ top: 12, right: 4, bottom: 0, left: 0 }}
            barCategoryGap="30%"
          >
            <CartesianGrid vertical={false} stroke={CHART_COLOR.grid} />
            <XAxis
              dataKey="tick"
              tickLine={false}
              axisLine={{ stroke: CHART_COLOR.grid }}
              tick={(props) => <ScenarioTick {...props} />}
              interval={0}
            />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              tick={{ fill: CHART_COLOR.axis, fontSize: 12 }}
              tickFormatter={(v: number) => formatNumber(v)}
              domain={[0, 'auto']}
              allowDecimals={false}
              tickCount={5}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-surface-hover)' }}
              content={(props) => <ScenarioTooltip {...props} />}
            />
            <Bar
              dataKey="sales"
              stackId="demand"
              maxBarSize={28}
              shape={SalesShape}
              {...animation}
            />
            <Bar
              dataKey="unmet"
              stackId="demand"
              maxBarSize={28}
              shape={UnmetShape}
              {...animation}
            />
            {/* Подпись линии в легенде под графиком, на самом графике она ложится на столбцы. */}
            <ReferenceLine
              y={seats}
              stroke={CHART_COLOR.seats}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              ifOverflow="extendDomain"
            />
          </BarChart>
        </ResponsiveContainer>
        {empty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center pl-11">
            <p className="bg-[var(--color-surface)] px-3 py-1 text-center text-sm text-[var(--color-fg-muted)]">
              При этой цене спроса нет ни в одном сценарии
            </p>
          </div>
        )}
      </div>

      {/* На телефоне три подписи в строку не помещаются, середина уходит вниз. */}
      <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-[var(--color-fg-muted)] min-[375px]:pl-11 sm:grid-cols-3">
        <span>пессимистичный</span>
        <span className="order-last col-span-2 text-center sm:order-none sm:col-span-1">
          сценарий, %
        </span>
        <span className="text-right">оптимистичный</span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-[var(--color-fg-muted)]">
        Проценты показывают вероятность того, что спрос окажется ниже значения
        на столбце. 50% — медиана.
      </p>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[var(--color-fg-muted)]">
        {points.some((p) => p.median && p.sales > 0) && (
          <Legend color={CHART_COLOR.median}>Медиана</Legend>
        )}
        {points.some((p) => !p.median && p.sales > 0) && (
          <Legend color={CHART_COLOR.neutral}>Другие сценарии</Legend>
        )}
        {hasUnmet && <Legend color={CHART_COLOR.over}>Не хватит мест</Legend>}
        <Legend color={CHART_COLOR.seats} dashed>
          Мест в самолёте: {formatNumber(seats)}
        </Legend>
      </ul>

      <figcaption className="mt-3 text-sm font-medium">
        {summary(points, forecast.price)}
      </figcaption>

      <ScenarioTable points={points} />
    </figure>
  );
}

function ScenarioTable({ points }: { points: Point[] }) {
  return (
    <details className="group mt-4 border-t border-[var(--color-border)] pt-3">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none"
        />
        Таблица сценариев
      </summary>
      <div
        className="mt-3 overflow-x-auto"
        role="region"
        aria-label="Таблица сценариев"
        tabIndex={0}
      >
        <table className="w-full text-sm tabular-nums">
          <thead className="text-xs text-[var(--color-fg-muted)]">
            <tr className="border-b border-[var(--color-border)]">
              <th scope="col" className="py-2 pr-3 text-left font-normal">
                Сценарий
              </th>
              <th scope="col" className="px-3 py-2 text-right font-normal">
                Хотят купить
              </th>
              <th scope="col" className="px-3 py-2 text-right font-normal">
                Купят
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-normal">
                Не хватит мест
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr
                key={p.label}
                className={cn(
                  'border-b border-[var(--color-border)] last:border-0',
                  p.median && 'font-semibold',
                )}
              >
                <th scope="row" className="py-2 pr-3 text-left font-[inherit]">
                  {p.label}
                  {p.median && (
                    <span className="font-normal text-[var(--color-fg-muted)]">
                      {' '}
                      медиана
                    </span>
                  )}
                </th>
                <td className="px-3 py-2 text-right">
                  {formatPeople(p.wants)}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatPeople(p.sales)}
                </td>
                <td className="py-2 pl-3 text-right">
                  {formatPeople(p.unmet)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function Legend({
  color,
  dashed = false,
  children,
}: {
  color: string;
  dashed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-1.5">
      {dashed ? (
        <span
          aria-hidden
          className="inline-block w-4 border-t-[1.5px] border-dashed"
          style={{ borderColor: color }}
        />
      ) : (
        <span
          aria-hidden
          className="inline-block size-2.5 rounded-[2px]"
          style={{ background: color }}
        />
      )}
      {children}
    </li>
  );
}
