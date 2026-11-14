import { randomBytes } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

// TTL скользящий: каждый запрос продлевает сессию на 30 дней.
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const SESSION_ID = /^[A-Za-z0-9_-]{43}$/;

const keyOf = (id: string) => `sess:${id}`;

// 32 случайных байта, подобрать нереально, поэтому куку не подписываем.
// При выходе ключ удаляется, и доступ пропадает сразу, в отличие от JWT.
@Injectable()
export class SessionStore {
  constructor(private readonly redis: RedisService) {}

  async create(userId: string): Promise<string> {
    const id = randomBytes(32).toString('base64url');
    await this.run(() =>
      this.redis.client.set(keyOf(id), userId, 'EX', SESSION_TTL_SECONDS),
    );
    return id;
  }

  async resolve(id: string): Promise<string | null> {
    if (!SESSION_ID.test(id)) return null;
    return this.run(() =>
      this.redis.client.getex(keyOf(id), 'EX', SESSION_TTL_SECONDS),
    );
  }

  async destroy(id: string): Promise<void> {
    if (!SESSION_ID.test(id)) return;
    await this.run(() => this.redis.client.del(keyOf(id)));
  }

  private async run<T>(command: () => Promise<T>): Promise<T> {
    try {
      return await command();
    } catch {
      throw new ServiceUnavailableException(
        'Вход временно недоступен. Попробуйте через минуту',
      );
    }
  }
}
