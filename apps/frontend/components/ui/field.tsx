import * as React from 'react';
import { cn } from '@/lib/cn';

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('text-sm font-medium text-[var(--color-fg)]', className)}
      {...props}
    />
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-input-border)] bg-[var(--color-surface)] px-3 text-[15px] text-[var(--color-fg)]',
        'placeholder:text-[var(--color-fg-subtle)]',
        'focus:border-[var(--color-accent)]',
        'disabled:cursor-not-allowed disabled:bg-[var(--color-surface-muted)] disabled:opacity-70',
        'aria-[invalid=true]:border-[var(--color-danger)]',
        className,
      )}
      {...props}
    />
  );
});

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactElement<Record<string, unknown>>;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {React.cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby':
          [errorId, hintId].filter(Boolean).join(' ') || undefined,
      })}
      {hint && !error && (
        <div id={hintId} className="text-xs text-[var(--color-fg-subtle)]">
          {hint}
        </div>
      )}
      {error && (
        <p id={errorId} className="text-xs text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
