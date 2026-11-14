'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  LIMITS,
  PASSWORD_PROBLEM_MESSAGE,
  checkPassword,
  personalHints,
} from '@reshis-avia/shared';
import { authApi } from '@/lib/api/auth';
import { messageOf } from '@/lib/api/client';
import { AuthFrame, FormError, TextLink } from '@/components/auth/auth-frame';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { PasswordRules } from '@/components/ui/password-rules';

export default function RegisterPage() {
  const router = useRouter();
  const [values, setValues] = React.useState({
    name: '',
    email: '',
    password: '',
  });
  // Повтор пароля проверяется только здесь и на сервер не уходит.
  const [confirm, setConfirm] = React.useState('');
  const [confirmTouched, setConfirmTouched] = React.useState(false);
  const confirmRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const mismatch = confirmTouched && confirm !== values.password;

  const change =
    (field: keyof typeof values) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setValues((prev) => ({ ...prev, [field]: event.target.value }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    // Те же правила, что на бэке, проверяем до отправки.
    const [problem] = checkPassword(values.password, personalHints(values));
    if (problem) {
      setError(PASSWORD_PROBLEM_MESSAGE[problem]);
      return;
    }
    if (confirm !== values.password) {
      setError(null);
      setConfirmTouched(true);
      confirmRef.current?.focus();
      return;
    }

    setPending(true);
    setError(null);
    try {
      await authApi.signup(values);
      router.push('/app');
      router.refresh();
    } catch (err) {
      setError(messageOf(err));
      setPending(false);
    }
  }

  return (
    <AuthFrame
      title="Регистрация"
      footer={
        <>
          Уже есть аккаунт? <TextLink href="/login">Войти</TextLink>
        </>
      }
    >
      <form method="post" onSubmit={handleSubmit} className="space-y-4">
        <Field id="name" label="Имя">
          <Input
            name="name"
            required
            autoComplete="name"
            autoFocus
            maxLength={LIMITS.NAME_MAX}
            value={values.name}
            onChange={change('name')}
            disabled={pending}
          />
        </Field>
        <Field id="email" label="Почта">
          <Input
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={LIMITS.EMAIL_MAX}
            value={values.email}
            onChange={change('email')}
            disabled={pending}
          />
        </Field>
        <Field
          id="password"
          label="Пароль"
          hint={values.password ? <PasswordRules {...values} /> : undefined}
        >
          <Input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            value={values.password}
            onChange={change('password')}
            disabled={pending}
          />
        </Field>
        <Field
          id="password-confirm"
          label="Повтор пароля"
          error={mismatch ? 'Пароли не совпадают' : undefined}
        >
          <Input
            ref={confirmRef}
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            onBlur={() => {
              if (confirm) setConfirmTouched(true);
            }}
            disabled={pending}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? 'Создаём аккаунт…' : 'Создать аккаунт'}
        </Button>
        <FormError message={error} />
      </form>
    </AuthFrame>
  );
}
