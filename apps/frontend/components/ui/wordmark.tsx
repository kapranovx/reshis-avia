import { cn } from '@/lib/cn';

// Иконка Plane из Lucide (лицензия ISC), та же что в app/icon.svg.
const PLANE =
  'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z';

// Знак как аэропортовый указатель: тёмная пиктограмма на жёлтом.
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn('size-6 shrink-0', className)}
    >
      <rect width="24" height="24" rx="4" fill="var(--color-signal)" />
      <path
        d={PLANE}
        transform="translate(4.8 4.8) scale(0.6)"
        fill="none"
        stroke="var(--color-signal-fg)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Mark className="size-9" />
      <span className="flex flex-col">
        <span className="font-[family-name:var(--font-display)] text-[21px] leading-[22px] font-semibold tracking-[0.01em] text-[var(--color-fg)]">
          Решись Авиа
        </span>
        <span className="text-xs leading-4 text-[var(--color-fg-muted)]">
          Прогноз продаж
        </span>
      </span>
    </span>
  );
}
