'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { NEXT_PARAM, safeNext } from '@reshis-avia/shared';
import { authApi } from '@/lib/api/auth';
import { messageOf } from '@/lib/api/client';
import { AuthFrame, FormError, TextLink } from '@/components/auth/auth-frame';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      await authApi.login({
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
      });
      const next = safeNext(
        new URLSearchParams(window.location.search).get(NEXT_PARAM),
      );
      router.push(next ?? '/app');
      router.refresh();
    } catch (err) {
      setError(messageOf(err));
      setPending(false);
    }
  }

  return (
    <AuthFrame
      title="Вход"
      footer={
        <>
          Нет аккаунта? <TextLink href="/register">Зарегистрироваться</TextLink>
        </>
      }
    >
      {/* method="post" нужен до гидрации: иначе браузер отправит форму GET-ом и пароль окажется в URL. */}
      <form method="post" onSubmit={handleSubmit} className="space-y-4">
        <Field id="email" label="Почта">
          <Input
            name="email"
            type="email"
            required
            autoComplete="username"
            autoFocus
            disabled={pending}
          />
        </Field>
        <Field id="password" label="Пароль">
          <Input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            disabled={pending}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? 'Входим…' : 'Войти'}
        </Button>
        <FormError message={error} />
      </form>
    </AuthFrame>
  );
}
