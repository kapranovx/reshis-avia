export const API_PREFIX = '/api/v1';

// Своё имя куки: куки не различают порты, и два приложения на localhost
// с одинаковым именем выкидывали бы друг друга из сессии.
export const SESSION_COOKIE = 'reshis_avia_session';

export const LIMITS = {
  NAME_MAX: 80,
  EMAIL_MAX: 254,
} as const;
