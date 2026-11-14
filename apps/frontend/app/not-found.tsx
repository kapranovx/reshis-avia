import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Flap } from '@/components/ui/flap';

export const metadata: Metadata = { title: 'Страница не найдена' };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="w-full max-w-md">
        <span className="sr-only">Ошибка 404.</span>
        <Flap text="404" className="text-6xl" />
        <h1 className="mt-6 font-[family-name:var(--font-display)] text-[2.75rem] leading-none font-bold">
          Страница не найдена
        </h1>
        <p className="mt-4 text-[var(--color-fg-muted)]">
          Такой страницы на сайте нет. Проверьте адрес в строке браузера.
        </p>
        <Button asChild size="lg" className="mt-7">
          <Link href="/">На главную</Link>
        </Button>
      </div>
    </main>
  );
}
