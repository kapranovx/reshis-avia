import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthedRequest } from './session-auth.guard';

/** Работает только вместе с SessionAuthGuard. */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    ctx.switchToHttp().getRequest<AuthedRequest>().userId,
);
