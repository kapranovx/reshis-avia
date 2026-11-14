import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Wordmark } from '@/components/ui/wordmark';

export function AuthFrame({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-18 w-full max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" aria-label="На главную" className="flex">
          <Wordmark />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-5 pt-4 pb-16">
        <div className="w-full max-w-[24rem]">
          <h1 className="font-[family-name:var(--font-display)] text-[2.75rem] leading-none font-bold">
            {title}
          </h1>
          <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-7">
            {children}
          </div>
          <p className="mt-5 text-sm text-[var(--color-fg-muted)]">{footer}</p>
        </div>
      </main>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-[var(--color-danger)]">
      {message}
    </p>
  );
}

export function TextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-medium text-[var(--color-fg)] underline decoration-[var(--color-signal)] decoration-2 underline-offset-4 hover:decoration-[var(--color-fg)]"
    >
      {children}
    </Link>
  );
}
