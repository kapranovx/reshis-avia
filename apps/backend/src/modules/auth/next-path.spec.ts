import { safeNext } from '@reshis-avia/shared';

describe('safeNext', () => {
  it.each([
    ['/app', '/app'],
    ['/app/reports/42', '/app/reports/42'],
    ['/app/reports/42?tab=1#top', '/app/reports/42?tab=1#top'],
  ])('пропускает путь кабинета %s', (raw, expected) => {
    expect(safeNext(raw)).toBe(expected);
  });

  it.each([
    'https://evil.example/app',
    '//evil.example/app',
    '/\\evil.example/app',
    '\\\\evil.example/app',
    'javascript:alert(1)',
    '/application',
    '/apple/app',
    '/login',
    '/',
    '',
    null,
    undefined,
  ])('отбрасывает %p', (raw) => {
    expect(safeNext(raw)).toBeNull();
  });

  it('разрешает обход вверх только внутри кабинета', () => {
    // URL сам схлопывает "..", проверяется итоговый путь.
    expect(safeNext('/app/../login')).toBeNull();
    expect(safeNext('/app/reports/../profile')).toBe('/app/profile');
  });
});
