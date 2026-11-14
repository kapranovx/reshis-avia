import {
  applyDecorators,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SkipThrottle } from '@nestjs/throttler';

// default действует на все маршруты. auth строже и включается только через @AuthRateLimit().
const MINUTE = 60_000;
const AUTH_ROUTE = 'throttle:auth-route';
const reflector = new Reflector();

export const DEFAULT_THROTTLER = 'default';
export const AUTH_THROTTLER = 'auth';

export const THROTTLER_PROFILES = [
  { name: DEFAULT_THROTTLER, ttl: MINUTE, limit: 300 },
  {
    name: AUTH_THROTTLER,
    ttl: MINUTE,
    limit: 20,
    skipIf: (ctx: ExecutionContext) =>
      reflector.get<boolean>(AUTH_ROUTE, ctx.getHandler()) !== true,
  },
];

export const AuthRateLimit = () =>
  applyDecorators(
    SetMetadata(AUTH_ROUTE, true),
    SkipThrottle({ [DEFAULT_THROTTLER]: true }),
  );
