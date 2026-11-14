import type { User } from '@prisma/client';
import type { PublicUser } from '@reshis-avia/shared';

/** Наружу пользователь отдаётся только через эту функцию, без passwordHash. */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}
