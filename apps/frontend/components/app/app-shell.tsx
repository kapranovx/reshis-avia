'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, UserRound } from 'lucide-react';
import { NEXT_PARAM, type PublicUser } from '@reshis-avia/shared';
import { authApi } from '@/lib/api/auth';
import { ApiError, messageOf } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ThemeList, ThemeToggle } from '@/components/ui/theme-toggle';
import { Wordmark } from '@/components/ui/wordmark';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; user: PublicUser }
  | { kind: 'failed'; message: string };

// proxy.ts пускает сюда по наличию куки. Жива ли сессия, проверяем запросом me.
// Истёкшую куку удаляем через logout, иначе proxy.ts зациклит редиректы между /login и /app.
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = React.useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = React.useState(0);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [logoutError, setLogoutError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    authApi.me().then(
      (user) => {
        if (!cancelled) setState({ kind: 'ready', user });
      },
      async (err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          await authApi.logout().catch(() => undefined);
          if (cancelled) return;
          const here = window.location.pathname + window.location.search;
          router.replace(`/login?${NEXT_PARAM}=${encodeURIComponent(here)}`);
          return;
        }
        setState({ kind: 'failed', message: messageOf(err) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await authApi.logout();
      router.push('/login');
      router.refresh();
    } catch (err) {
      setLogoutError(`Не удалось выйти. ${messageOf(err)}`);
      setLoggingOut(false);
    }
  }

  const user = state.kind === 'ready' ? state.user : null;
  const logoutLabel = loggingOut ? 'Выходим…' : 'Выйти';

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-5">
          {/* flex: строчная ссылка добавляла снизу место под выносные элементы, и знак уезжал вверх. */}
          <Link href="/app" aria-label="К прогнозу" className="flex">
            <Wordmark />
          </Link>

          <div className="ml-auto hidden items-center gap-3 sm:flex">
            {user && (
              <span
                title={user.email}
                className="max-w-[18ch] truncate text-sm text-[var(--color-fg-muted)]"
              >
                {user.name}
              </span>
            )}
            <ThemeToggle />
            {user && (
              <Button
                variant="secondary"
                size="sm"
                disabled={loggingOut}
                onClick={() => void logout()}
              >
                <LogOut />
                {logoutLabel}
              </Button>
            )}
          </div>

          {/* На телефоне имя, тема и выход не помещаются в строку: они в меню. */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                aria-label="Аккаунт и тема"
                className="ml-auto size-10 px-0 sm:hidden"
              >
                <UserRound />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2">
              {user && (
                <div className="border-b border-[var(--color-border)] px-2.5 pt-1.5 pb-3">
                  <p className="truncate font-medium">{user.name}</p>
                  <p className="truncate text-sm text-[var(--color-fg-muted)]">
                    {user.email}
                  </p>
                </div>
              )}
              <p className="px-2.5 pt-3 pb-1 text-xs text-[var(--color-fg-subtle)]">
                Тема оформления
              </p>
              <ThemeList />
              {user && (
                <div className="mt-2 border-t border-[var(--color-border)] pt-2">
                  <button
                    type="button"
                    disabled={loggingOut}
                    onClick={() => void logout()}
                    className="flex h-10 w-full items-center gap-3 rounded-[var(--radius-md)] px-2.5 text-left text-sm transition-colors hover:bg-[var(--color-surface-hover)] disabled:opacity-55"
                  >
                    <LogOut
                      aria-hidden
                      className="size-4 text-[var(--color-fg-muted)]"
                    />
                    {logoutLabel}
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 sm:py-8">
        {logoutError && (
          <p
            role="alert"
            className="mb-5 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-subtle)] p-3 text-sm text-[var(--color-danger)]"
          >
            {logoutError}
          </p>
        )}
        {state.kind === 'ready' ? (
          children
        ) : state.kind === 'failed' ? (
          <div className="py-12 text-center">
            <p role="alert" className="text-[var(--color-fg-muted)]">
              {state.message}
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                setState({ kind: 'loading' });
                setAttempt((n) => n + 1);
              }}
            >
              Попробовать снова
            </Button>
          </div>
        ) : (
          <div
            role="status"
            className="grid gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]"
          >
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <p className="text-sm text-[var(--color-fg-subtle)]">
                Открываем прогноз…
              </p>
              <div aria-hidden className="mt-6 space-y-6">
                <div className="h-11 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)]" />
                <div className="h-11 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)]" />
                <div className="h-11 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)]" />
              </div>
            </div>
            <div
              aria-hidden
              className="board hidden min-h-80 rounded-[var(--radius-lg)] lg:block"
            />
          </div>
        )}
      </main>
    </div>
  );
}
