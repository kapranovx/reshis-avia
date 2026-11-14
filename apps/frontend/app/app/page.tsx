'use client';

import { useCurrentUser } from '@/components/app/app-shell';

const DATE = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default function CabinetPage() {
  const user = useCurrentUser();

  return (
    <div className="max-w-xl">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-[-0.03em]">
        Здравствуйте, {user.name}
      </h1>
      <dl className="mt-8 divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Row label="Почта" value={user.email} />
        <Row
          label="Аккаунт создан"
          value={DATE.format(new Date(user.createdAt))}
        />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-4">
      <dt className="text-sm text-[var(--color-fg-muted)]">{label}</dt>
      <dd className="text-sm font-medium break-all">{value}</dd>
    </div>
  );
}
