import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

// cursor-pointer явно, в том числе для asChild (ссылка в виде кнопки).
const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)]',
        secondary:
          'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] hover:bg-[var(--color-surface-hover)]',
        ghost:
          'text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-fg)]',
        danger:
          'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)]',
      },
      size: {
        sm: 'h-8 px-3 pointer-coarse:h-10 pointer-coarse:px-3.5',
        md: 'h-10 px-4',
        lg: 'h-11 px-5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
