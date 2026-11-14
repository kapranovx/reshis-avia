import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { Redis } from 'ioredis';
import { AUTH_THROTTLER } from './throttle';

// Счётчики в Redis, а не в памяти процесса, чтобы не сбрасывались при каждом деплое.
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);

  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    try {
      return await this.count(key, ttl, limit, blockDuration, throttlerName);
    } catch (err) {
      const reason = (err as Error).message;

      // Без Redis закрываем вход: иначе пароль можно было бы перебирать без лимита.
      // Остальные маршруты пропускаем без лимита.
      if (throttlerName === AUTH_THROTTLER) {
        this.logger.error(`Redis недоступен (${reason}), вход закрыт`);
        throw new ServiceUnavailableException(
          'Сервис временно недоступен, попробуйте через минуту',
        );
      }

      this.logger.warn(
        `Redis недоступен (${reason}), лимит ${throttlerName} пропущен для ${key}`,
      );
      return {
        totalHits: 0,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }

  private async count(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const blockKey = `${key}:block:${throttlerName}`;

    const blocked = await this.redis.pttl(blockKey);
    if (blocked > 0) {
      return {
        totalHits: limit + 1,
        timeToExpire: blocked,
        isBlocked: true,
        timeToBlockExpire: blocked,
      };
    }

    const counterKey = `${key}:count:${throttlerName}`;
    const tx = this.redis.multi();
    tx.incr(counterKey);
    tx.pttl(counterKey);
    const replies = (await tx.exec()) ?? [];

    let totalHits = 1;
    let pttl = -2;
    if (replies[0]?.[1] != null) totalHits = Number(replies[0][1]);
    if (replies[1]?.[1] != null) pttl = Number(replies[1][1]);

    if (pttl < 0) {
      await this.redis.pexpire(counterKey, ttl);
      pttl = ttl;
    }

    const isBlocked = totalHits > limit;
    if (isBlocked && blockDuration > 0) {
      await this.redis.set(blockKey, '1', 'PX', blockDuration);
    }

    return {
      totalHits,
      timeToExpire: pttl,
      isBlocked,
      timeToBlockExpire: isBlocked ? blockDuration : 0,
    };
  }
}
