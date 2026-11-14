import { ThrottlerAsyncOptions } from '@nestjs/throttler';
import { RedisService } from '../redis/redis.service';
import { RedisThrottlerStorage } from './throttler-redis.storage';
import { THROTTLER_PROFILES } from './throttle';

// Лимиты считаются по req.ip, поэтому за прокси обязательно нужен TRUST_PROXY_HOPS.
export const throttlerConfig: ThrottlerAsyncOptions = {
  inject: [RedisService],
  useFactory: (redis: RedisService) => ({
    throttlers: THROTTLER_PROFILES,
    errorMessage: 'Слишком много запросов. Подождите минуту и попробуйте снова',
    storage: new RedisThrottlerStorage(redis.client),
  }),
};
