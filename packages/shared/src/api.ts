// Любой ответ API имеет вид { data, error }.
export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'INTERNAL';

export interface ApiErrorPayload {
  code: ApiErrorCode;
  message: string;
  /** Ошибки валидации по полям. */
  details?: unknown;
  requestId?: string;
}

export interface ApiEnvelope<T> {
  data: T | null;
  error: ApiErrorPayload | null;
}
