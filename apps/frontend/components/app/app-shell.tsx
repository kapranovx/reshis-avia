'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { NEXT_PARAM, type PublicUser } from '@reshis-avia/shared';
import { authApi } from '@/lib/api/auth';
import { ApiError, messageOf } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
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

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-4 px-5">
          <Link href="/app" aria-label="К прогнозу">
            <Wordmark />
          </Link>
          <div className="ml-auto flex items-center gap-3">
            {state.kind === 'ready' && (
              <span
                title={state.user.email}
                className="hidden max-w-[18ch] truncate text-sm text-[var(--color-fg-muted)] sm:inline"
              >
                {state.user.name}
              </span>
            )}
            <ThemeToggle className="hidden sm:inline-flex" />
            {state.kind === 'ready' && (
              <Button
                variant="ghost"
                size="sm"
                disabled={loggingOut}
                onClick={() => void logout()}
              >
                <LogOut />
                {loggingOut ? 'Выходим…' : 'Выйти'}
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6 sm:py-8">
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
          </div>
        )}
      </main>
    </div>
  );
}
