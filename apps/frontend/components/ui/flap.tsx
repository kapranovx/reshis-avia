import type * as React from 'react';
import { cn } from '@/lib/cn';

// Перекидные таблички табло. Текст дополняется слева пустыми табличками
// до length, как на табло вылетов. Табличка перелистывается, только когда
// её символ меняется. Для экранных чтецов текст нужно дать рядом: таблички
// скрыты от них.
export function Flap({
  text,
  length = text.length,
  order = 0,
  className,
}: {
  text: string;
  length?: number;
  // Сдвиг задержки, чтобы несколько табло перелистывались по очереди.
  order?: number;
  className?: string;
}) {
  const chars = text.padStart(length, ' ').split('');

  return (
    <span aria-hidden className={cn('flap', className)}>
      {chars.map((char, i) => (
        <span
          key={i}
          className="flap-tile"
          data-wide={/\p{Lu}/u.test(char) ? '' : undefined}
        >
          <span
            key={char}
            className="flap-char"
            style={{ '--flap-order': order + i } as React.CSSProperties}
          >
            {char === ' ' ? ' ' : char}
          </span>
        </span>
      ))}
    </span>
  );
}
