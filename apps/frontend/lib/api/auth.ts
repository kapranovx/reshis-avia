import type { LoginDto, PublicUser, SignupDto } from '@reshis-avia/shared';
import { apiFetch } from './client';

// Токены не храним: сессия в httpOnly-куке, из JS её не достать.
export const authApi = {
  signup: (dto: SignupDto): Promise<PublicUser> =>
    apiFetch<PublicUser>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  login: (dto: LoginDto): Promise<PublicUser> =>
    apiFetch<PublicUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  logout: (): Promise<void> =>
    apiFetch<void>('/auth/logout', { method: 'POST' }),

  me: (): Promise<PublicUser> => apiFetch<PublicUser>('/auth/me'),
};
