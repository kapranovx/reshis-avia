import Link from 'next/link';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@reshis-avia/shared';
import { ForecastExample } from '@/components/landing/forecast-example';
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

      <main className="mx-auto grid w-full max-w-5xl flex-1 content-center items-center gap-x-16 gap-y-12 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <h1 className="max-w-xl text-4xl leading-[1.08] font-bold tracking-[-0.035em] sm:text-[3.25rem]">
            Сколько билетов купят на рейс
          </h1>
          <p className="mt-5 max-w-lg text-lg text-[var(--color-fg-muted)]">
            Выберите направление, дату вылета и цену билета. Сервис покажет,
            сколько людей захотят купить билет и сколько купят с учётом мест в
            самолёте.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {signedIn ? (
              <Button asChild size="lg">
                <Link href="/app">Открыть прогноз</Link>
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
        </div>

        <ForecastExample />
      </main>

      <footer className="mx-auto w-full max-w-5xl px-5 pb-6 text-xs text-[var(--color-fg-subtle)]">
        Кейс «Разработка» турнира «Решись!»
      </footer>
    </div>
  );
}
