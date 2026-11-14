import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis, { Redis } from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) public readonly client: Redis) {}

  static createClient(config: ConfigService): Redis {
    const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');
    // Без offline-очереди и с таймаутом: если Redis лежит, запрос сразу падает, а не висит.
    const client = new IORedis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      commandTimeout: 2_000,
    });
    const logger = new Logger('Redis');
    client.on('connect', () => logger.log(`Connected ${url}`));
    client.on('error', (err: Error) => logger.error(err.message));
    return client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }
}
