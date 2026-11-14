import Link from 'next/link';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@reshis-avia/shared';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Wordmark } from '@/components/ui/wordmark';

export default async function HomePage() {
  // Кука ещё не значит, что сессия жива. Это проверит AppShell.
  const signedIn = (await cookies()).has(SESSION_COOKIE);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5">
        <Wordmark />
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 pb-[12vh]">
        <p className="text-sm font-medium text-[var(--color-fg-muted)]">
          Турнир «Решись!» · кейс «Разработка»
        </p>
        <h1 className="mt-3 max-w-2xl font-[family-name:var(--font-display)] text-4xl leading-[1.1] font-bold tracking-[-0.035em] sm:text-5xl">
          Прогноз продаж авиабилетов
        </h1>
        <div className="mt-9 flex flex-wrap gap-3">
          {signedIn ? (
            <Button asChild size="lg">
              <Link href="/app">Открыть кабинет</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link href="/register">Создать аккаунт</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/login">Войти</Link>
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
