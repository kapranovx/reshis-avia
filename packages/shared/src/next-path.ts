export const NEXT_PARAM = 'next';

const BASE = 'http://app.invalid';

// Куда вернуть после логина. Разрешены только пути внутри /app на нашем домене,
// иначе параметр next можно было бы использовать для фишинговых редиректов.
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw || raw.includes('\\')) return null;

  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;
  if (!/^\/app(\/|$)/.test(url.pathname)) return null;

  return url.pathname + url.search + url.hash;
}
