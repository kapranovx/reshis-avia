// Кодировка графика спроса, общая для страницы прогноза и примера на главной.
// Столбец сценария делится линией мест: ниже купят, выше не хватит мест.

export const CHART_COLOR = {
  median: 'var(--color-accent)',
  neutral: 'var(--color-chart-neutral)',
  over: 'var(--color-chart-over)',
  seats: 'var(--color-fg)',
  axis: 'var(--color-fg-muted)',
  grid: 'var(--color-border)',
};

// Просвет цвета фона между частями столбца.
export const SEGMENT_GAP = 2;
const RADIUS = 4;

// Прямоугольник со скруглённым верхом и прямым низом у базовой линии.
export function columnPath(
  x: number,
  y: number,
  width: number,
  height: number,
  roundTop: boolean,
): string {
  const r = roundTop ? Math.min(RADIUS, width / 2, height) : 0;
  const bottom = y + height;
  if (r === 0) return `M${x},${bottom}V${y}H${x + width}V${bottom}Z`;
  return [
    `M${x},${bottom}`,
    `V${y + r}`,
    `A${r},${r} 0 0 1 ${x + r},${y}`,
    `H${x + width - r}`,
    `A${r},${r} 0 0 1 ${x + width},${y + r}`,
    `V${bottom}Z`,
  ].join('');
}
