'use client';

import * as React from 'react';
import { DayPicker, type ChevronProps } from 'react-day-picker';
import { ru } from 'react-day-picker/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

// Календарь в духе shadcn: DayPicker без его CSS, оформление токенами сайта.
export function Calendar({
  className,
  classNames,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={ru}
      weekStartsOn={1}
      className={cn(
        'p-3 [--day-size:min(2.5rem,calc((100vw-3.25rem)/7))]',
        className,
      )}
      classNames={{
        months: 'relative',
        month_caption:
          'flex h-9 items-center justify-center text-sm font-semibold capitalize',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous: NAV_BUTTON,
        button_next: NAV_BUTTON,
        chevron: 'size-4',
        month_grid: 'mt-2 border-collapse',
        weekdays: 'flex',
        weekday:
          'w-[var(--day-size)] pb-1 text-center text-xs font-normal text-[var(--color-fg-subtle)]',
        week: 'flex',
        day: 'size-[var(--day-size)] p-0 text-center',
        day_button:
          'size-[var(--day-size)] cursor-pointer rounded-[var(--radius-md)] text-sm tabular-nums transition-colors hover:bg-[var(--color-surface-hover)] disabled:cursor-default disabled:hover:bg-transparent',
        selected:
          '[&>button]:bg-[var(--color-signal)] [&>button]:font-semibold [&>button]:text-[var(--color-signal-fg)] [&>button]:hover:bg-[var(--color-signal-hover)]',
        disabled: 'text-[var(--color-fg-subtle)] opacity-40',
        outside: 'invisible',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{ Chevron }}
      {...props}
    />
  );
}

const NAV_BUTTON =
  'inline-flex size-9 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-fg)] disabled:pointer-events-none disabled:opacity-30';

function Chevron({ orientation }: ChevronProps) {
  return orientation === 'left' ? (
    <ChevronLeft className="size-4" />
  ) : (
    <ChevronRight className="size-4" />
  );
}
