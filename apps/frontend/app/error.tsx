'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function RootError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  // У серверных ошибок есть digest, по нему их можно найти в логах.
  const digest =
    error instanceof Error && 'digest' in error ? String(error.digest) : null;

  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          Что-то пошло не так
        </h1>
        <p className="mt-3 text-[var(--color-fg-muted)]">
          Страница не открылась из-за ошибки на нашей стороне. Попробуйте ещё
          раз.
        </p>
        {digest && (
          <p className="mt-2 text-xs text-[var(--color-fg-subtle)]">
            Номер ошибки: {digest}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => retry()}>Попробовать снова</Button>
          <Button asChild variant="secondary">
            <Link href="/">На главную</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
