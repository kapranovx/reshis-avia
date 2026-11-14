import Link from 'next/link';
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
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12 sm:pb-[10vh]">
      <div className="w-full max-w-[23rem]">
        <Link href="/" className="mb-8 inline-block" aria-label="На главную">
          <Wordmark />
        </Link>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-7">
          <h1 className="text-[19px] font-semibold tracking-[-0.02em]">
            {title}
          </h1>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-sm text-[var(--color-fg-muted)]">{footer}</p>
      </div>
    </main>
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
      className="text-[var(--color-accent)] underline underline-offset-4"
    >
      {children}
    </Link>
  );
}
