import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Страница не найдена' };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="w-full max-w-md">
        <p className="text-sm font-medium text-[var(--color-fg-subtle)]">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
          Страница не найдена
        </h1>
        <p className="mt-3 text-[var(--color-fg-muted)]">
          Такой страницы на сайте нет. Проверьте адрес в строке браузера.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">На главную</Link>
        </Button>
      </div>
    </main>
  );
}
