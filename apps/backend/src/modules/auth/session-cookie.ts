import type { CookieOptions, Request } from 'express';
import { SESSION_COOKIE } from '@reshis-avia/shared';
import { SESSION_TTL_SECONDS } from './session.store';

// httpOnly прячет куку от JS, sameSite=lax не даёт отправить её POST-запросом с чужого сайта.
export function sessionCookieOptions(isProd: boolean): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000,
  };
}

// Чтобы браузер удалил куку, атрибуты должны совпадать с теми, с которыми её ставили.
export function sessionCookieClearOptions(isProd: boolean): CookieOptions {
  const options = sessionCookieOptions(isProd);
  delete options.maxAge;
  return options;
}

export function sessionIdOf(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[SESSION_COOKIE];
  return typeof value === 'string' ? value : undefined;
}
