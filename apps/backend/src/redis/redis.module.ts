import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService, REDIS_CLIENT } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => RedisService.createClient(config),
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
