'use client';

import * as React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
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

export function ThemeToggle({ className }: { className?: string }) {
  const choice = React.useSyncExternalStore(
    subscribeToTheme,
    readTheme,
    themeServerSnapshot,
  );

  return (
    <div
      role="radiogroup"
      aria-label="Тема оформления"
      className={cn(
        'inline-flex rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5',
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
              'flex size-8 items-center justify-center rounded-[var(--radius-sm)] transition-colors pointer-coarse:size-10',
              active
                ? 'bg-[var(--color-surface-hover)] text-[var(--color-fg)]'
                : 'text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-muted)]',
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
