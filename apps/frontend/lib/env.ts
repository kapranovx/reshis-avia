import { API_PREFIX } from '@reshis-avia/shared';

// Браузер ходит на localhost, иначе не уйдёт кука.
// SSR ходит на 127.0.0.1, потому что localhost в Node сначала резолвится в IPv6.
const isServer = typeof window === 'undefined';

const BROWSER_FALLBACK = `http://localhost:3501${API_PREFIX}`;
const SERVER_FALLBACK = `http://127.0.0.1:3501${API_PREFIX}`;

export const API_URL: string = isServer
  ? (process.env.API_URL_INTERNAL ?? SERVER_FALLBACK)
  : (process.env.NEXT_PUBLIC_API_URL ?? BROWSER_FALLBACK);
