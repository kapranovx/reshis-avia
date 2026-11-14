'use client';

import * as React from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import {
  THEME_CHOICES,
  THEME_LABELS,
  readTheme,
  setTheme,
  subscribeToTheme,
  themeServerSnapshot,
  type ThemeChoice,
} from '@/lib/theme';
import { cn } from '@/lib/cn';

const ICONS: Record<ThemeChoice, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

function useTheme(): ThemeChoice {
  return React.useSyncExternalStore(
    subscribeToTheme,
    readTheme,
    themeServerSnapshot,
  );
}

// Компактный переключатель из трёх иконок для шапки.
export function ThemeToggle({ className }: { className?: string }) {
  const choice = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Тема оформления"
      className={cn(
        'inline-flex rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-0.5',
        className,
      )}
    >
      {THEME_CHOICES.map((value) => {
        const Icon = ICONS[value];
        const active = choice === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={THEME_LABELS[value]}
            title={THEME_LABELS[value]}
            onClick={() => setTheme(value)}
            className={cn(
              'flex size-8 items-center justify-center rounded-[var(--radius-sm)] transition-colors pointer-coarse:size-9',
              active
                ? 'bg-[var(--color-fg)] text-[var(--color-surface)]'
                : 'text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)]',
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

// Список с подписями для меню на телефоне.
export function ThemeList() {
  const choice = useTheme();

  return (
    <div role="radiogroup" aria-label="Тема оформления" className="space-y-0.5">
      {THEME_CHOICES.map((value) => {
        const Icon = ICONS[value];
        const active = choice === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              'flex h-10 w-full items-center gap-3 rounded-[var(--radius-md)] px-2.5 text-left text-sm transition-colors hover:bg-[var(--color-surface-hover)]',
              active && 'font-medium',
            )}
          >
            <Icon aria-hidden className="size-4 text-[var(--color-fg-muted)]" />
            {THEME_LABELS[value]}
            {active && <Check aria-hidden className="ml-auto size-4" />}
          </button>
        );
      })}
    </div>
  );
}
