// Числа и даты для интерфейса. API отдаёт точные числа, люди округляются здесь.

const INTEGER = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

const DATE_LONG = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const WEEKDAY = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  timeZone: 'UTC',
});

const PLURAL = new Intl.PluralRules('ru-RU');

export function formatNumber(value: number): string {
  return INTEGER.format(value);
}

// Отрицательный спрос по формуле возможен, но людей меньше нуля не бывает.
export function roundPeople(value: number): number {
  return Math.max(0, Math.round(value));
}

export function formatPeople(value: number): string {
  return INTEGER.format(roundPeople(value));
}

export function formatRubles(value: number): string {
  return `${INTEGER.format(Math.round(value))} ₽`;
}

const MILLIONS = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Крупные суммы коротко: 4 017 600 → 4,02 млн ₽, 45 503 → 46 тыс. ₽.
export function formatMoney(value: number): string {
  const sign = value < 0 ? '−' : '';
  const abs = Math.abs(value);
  if (Math.round(abs / 1000) >= 1000) {
    return `${sign}${MILLIONS.format(abs / 1_000_000)} млн ₽`;
  }
  if (abs >= 1000) {
    return `${sign}${INTEGER.format(Math.round(abs / 1000))} тыс. ₽`;
  }
  return `${sign}${INTEGER.format(Math.round(abs))} ₽`;
}

// 2026-06-01 → 1 июня
export function formatDay(isoDate: string): string {
  return DATE_LONG.format(utcDate(isoDate));
}

// 2026-06-01 → 1 июня, понедельник
export function formatDayWithWeekday(isoDate: string): string {
  const date = utcDate(isoDate);
  return `${DATE_LONG.format(date)}, ${WEEKDAY.format(date)}`;
}

// Формы для 1, 3 и 5: plural(383, ['человек', 'человека', 'человек']).
export function plural(
  count: number,
  [one, few, many]: [string, string, string],
): string {
  const form = PLURAL.select(count);
  if (form === 'one') return one;
  if (form === 'few') return few;
  return many;
}

function utcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}
