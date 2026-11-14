import * as React from 'react';
import { cn } from '@/lib/cn';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-input-border)] bg-[var(--color-surface)] px-3 text-[15px] text-[var(--color-fg)]',
        'focus:border-[var(--color-accent)]',
        'disabled:cursor-not-allowed disabled:bg-[var(--color-surface-muted)] disabled:opacity-70',
        className,
      )}
      {...props}
    />
  );
});
