import type { ApiEnvelope, ApiErrorPayload } from '@reshis-avia/shared';
import { API_URL } from '@/lib/env';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorPayload['code'] | 'NETWORK',
    public readonly userMessage: string,
    public readonly path: string,
    public readonly details?: unknown,
    public readonly requestId?: string,
  ) {
    super(`API ${status} ${code} on ${path}: ${userMessage}`);
    this.name = 'ApiError';
  }
}

type FetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
  /** 0 отключает таймаут. */
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 30_000;

/** Сообщение для пользователя. У ApiError оно всегда на русском. */
export function messageOf(
  err: unknown,
  fallback = 'Что-то пошло не так. Попробуйте ещё раз',
): string {
  return err instanceof ApiError ? err.userMessage : fallback;
}

/** Запрос к API. Разворачивает конверт { data, error }, при ошибке бросает ApiError. */
export async function apiFetch<T>(path: string, init?: FetchInit): Promise<T> {
  const url = `${API_URL}${path}`;
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Свой контроллер, чтобы таймаут работал вместе с signal вызывающего кода.
  const controller = new AbortController();
  const timer =
    timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  init?.signal?.addEventListener('abort', () => controller.abort());

  let res: Response;

  try {
    res = await fetch(url, {
      credentials: 'include',
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...init?.headers,
      },
    });
  } catch (err) {
    const aborted = (err as Error)?.name === 'AbortError';
    throw new ApiError(
      0,
      'NETWORK',
      aborted
        ? 'Сервер не ответил вовремя. Проверьте интернет и попробуйте ещё раз'
        : 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз',
      path,
    );
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }

  if (res.status === 204) return undefined as T;

  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = (await res.json()) as ApiEnvelope<T>;
  } catch {
    // Не JSON, значит ответил прокси (502-504, пока бэкенд перезапускается).
    if (!res.ok) {
      throw new ApiError(
        res.status,
        'INTERNAL',
        res.status >= 500
          ? 'Сервер временно недоступен. Попробуйте через минуту'
          : 'Ошибка запроса',
        path,
      );
    }
    return undefined as T;
  }

  if (envelope?.error) {
    const e = envelope.error;
    throw new ApiError(
      res.status,
      e.code,
      e.message,
      path,
      e.details,
      e.requestId,
    );
  }
  if (!res.ok) {
    throw new ApiError(res.status, 'INTERNAL', 'Ошибка запроса', path);
  }

  return (envelope?.data ?? null) as T;
}
