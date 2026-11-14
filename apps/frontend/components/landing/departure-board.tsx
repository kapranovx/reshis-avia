import { Flap } from '@/components/ui/flap';
import { formatNumber, plural } from '@/lib/format';

// Расчёт сервиса по data/my_forecast.csv на 2026-06-12 при базовой цене
// каждого маршрута, сверен с API. Если подменить данные, табло нужно
// пересчитать.
const DATE = '12 июня, пятница';
const FLIGHTS = [
  { code: 'AER', city: 'Сочи', seats: 900, wants: 797, sales: 797 },
  { code: 'LED', city: 'Санкт-Петербург', seats: 1440, wants: 952, sales: 952 },
  { code: 'KGD', city: 'Калининград', seats: 450, wants: 461, sales: 450 },
  { code: 'OVB', city: 'Новосибирск', seats: 270, wants: 234, sales: 234 },
  { code: 'MRV', city: 'Минеральные Воды', seats: 360, wants: 317, sales: 317 },
];

// Табличек под число столько, сколько цифр в самом большом числе мест.
const DIGITS = String(Math.max(...FLIGHTS.map((f) => f.seats))).length;
// Строки табло перелистываются сверху вниз, каждая чуть позже предыдущей.
const ROW_DELAY = 3;

export function DepartureBoard() {
  return (
    <figure className="board rounded-[var(--radius-lg)] p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[0.01em]">
          Вылеты из Москвы, {DATE}
        </h2>
      </div>
      <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
        Прогноз продаж при базовой цене билета
      </p>

      <table className="mt-5 w-full border-collapse">
        <thead>
          <tr className="text-left text-xs text-[var(--color-fg-subtle)]">
            <th scope="col" className="pb-2 font-normal">
              Направление
            </th>
            <th scope="col" className="pb-2 text-right font-normal">
              Купят
            </th>
          </tr>
        </thead>
        <tbody>
          {FLIGHTS.map((f, row) => {
            const short = f.wants - f.seats;
            const load = Math.round((f.sales / f.seats) * 100);
            return (
              <tr key={f.code} className="border-t border-[var(--color-border)]">
                <th
                  scope="row"
                  className="py-3 pr-3 text-left font-normal sm:py-3.5"
                >
                  <span className="flex items-center gap-3">
                    <Flap
                      text={f.code}
                      order={row * ROW_DELAY}
                      className="shrink-0 text-[26px] sm:text-[30px]"
                    />
                    <span className="min-w-0">
                      <span className="block leading-tight font-medium">
                        {f.city}
                      </span>
                      <span
                        className={
                          short > 0
                            ? 'block text-sm text-[var(--color-chart-over)]'
                            : 'block text-sm text-[var(--color-fg-muted)]'
                        }
                      >
                        {short > 0
                          ? `Мест не хватит ${formatNumber(short)} ${plural(short, ['желающему', 'желающим', 'желающим'])}`
                          : `Загрузка ${load}%`}
                      </span>
                    </span>
                  </span>
                </th>
                <td className="py-3 text-right align-middle sm:py-3.5">
                  <span className="sr-only">
                    {formatNumber(f.sales)} из {formatNumber(f.seats)}{' '}
                    {plural(f.seats, ['места', 'мест', 'мест'])}
                  </span>
                  <Flap
                    text={String(f.sales)}
                    length={DIGITS}
                    order={row * ROW_DELAY + 1}
                    className="text-[26px] sm:text-[30px]"
                  />
                  <span
                    aria-hidden
                    className="mt-1 block text-xs text-[var(--color-fg-muted)] tabular-nums"
                  >
                    из {formatNumber(f.seats)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </figure>
  );
}
