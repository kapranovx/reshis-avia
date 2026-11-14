import Link from 'next/link';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@reshis-avia/shared';
import { DepartureBoard } from '@/components/landing/departure-board';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Wordmark } from '@/components/ui/wordmark';

export default async function HomePage() {
  // Кука ещё не значит, что сессия жива. Это проверит AppShell.
  const signedIn = (await cookies()).has(SESSION_COOKIE);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-18 w-full max-w-6xl items-center justify-between gap-4 px-5">
        <Wordmark />
        <ThemeToggle />
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 content-center items-center gap-x-14 gap-y-10 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,31rem)]">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(3.25rem,11vw,5.25rem)] leading-[0.92] font-bold tracking-[-0.01em]">
            Сколько билетов купят на рейс
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-[var(--color-fg-muted)]">
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

        <DepartureBoard />
      </main>

      <footer className="mx-auto w-full max-w-6xl px-5 pb-6 text-xs text-[var(--color-fg-subtle)]">
        Кейс «Разработка» турнира «Решись!»
      </footer>
    </div>
  );
}
