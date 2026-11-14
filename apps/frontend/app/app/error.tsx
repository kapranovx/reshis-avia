'use client';

import { Button } from '@/components/ui/button';

export default function CabinetError({ retry }: { retry: () => void }) {
  return (
    <div className="max-w-md">
      <h1 className="font-[family-name:var(--font-display)] text-[2.75rem] leading-none font-bold">
        Раздел не открылся
      </h1>
      <p className="mt-3 text-[var(--color-fg-muted)]">
        Произошла ошибка на нашей стороне. Попробуйте ещё раз.
      </p>
      <Button className="mt-6" onClick={() => retry()}>
        Попробовать снова
      </Button>
    </div>
  );
}
