'use client';

import { Check, Dot } from 'lucide-react';
import { passwordRules, personalHints } from '@reshis-avia/shared';
import { cn } from '@/lib/cn';

// Та же проверка, что на сервере, поэтому подсказка совпадает с ответом API.
export function PasswordRules({
  password,
  email,
  name,
}: {
  password: string;
  email?: string;
  name?: string;
}) {
  if (!password) return null;

  const rules = passwordRules(password, personalHints({ email, name }));

  return (
    <ul className="space-y-1 pt-0.5">
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={cn(
            'flex items-start gap-1 text-xs leading-5',
            rule.ok
              ? 'text-[var(--color-success)]'
              : 'text-[var(--color-fg-subtle)]',
          )}
        >
          {rule.ok ? (
            <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          ) : (
            <Dot className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          )}
          <span>{rule.label}</span>
        </li>
      ))}
    </ul>
  );
}
