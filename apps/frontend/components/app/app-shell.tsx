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

const UserContext = React.createContext<PublicUser | null>(null);

export function useCurrentUser(): PublicUser {
  const user = React.useContext(UserContext);
  if (!user) throw new Error('useCurrentUser работает только внутри AppShell');
  return user;
}

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
    await authApi.logout().catch(() => undefined);
    router.push('/login');
    router.refresh();
  }

  if (state.kind === 'loading') {
    return (
      <Centered>
        <p className="text-sm text-[var(--color-fg-subtle)]">Загрузка…</p>
      </Centered>
    );
  }

  if (state.kind === 'failed') {
    return (
      <Centered>
        <p className="text-[var(--color-fg-muted)]">{state.message}</p>
        <Button
          className="mt-4"
          onClick={() => {
            setState({ kind: 'loading' });
            setAttempt((n) => n + 1);
          }}
        >
          Попробовать снова
        </Button>
      </Centered>
    );
  }

  return (
    <UserContext value={state.user}>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-5">
            <Link href="/app" aria-label="В кабинет">
              <Wordmark />
            </Link>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden max-w-[18ch] truncate text-sm text-[var(--color-fg-muted)] sm:inline">
                {state.user.name}
              </span>
              <ThemeToggle className="hidden sm:inline-flex" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void logout()}
                aria-label="Выйти"
              >
                <LogOut />
                <span className="hidden sm:inline">Выйти</span>
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
          {children}
        </main>
      </div>
    </UserContext>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      {children}
    </div>
  );
}
