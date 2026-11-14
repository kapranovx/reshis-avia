import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { sessionIdOf } from './session-cookie';
import { SessionStore } from './session.store';

export type AuthedRequest = Request & { userId: string; sessionId: string };

// userId в обработчиках брать только через @CurrentUserId(), не из тела запроса и не из URL.
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionStore) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const sessionId = sessionIdOf(req);
    if (!sessionId) throw new UnauthorizedException('Требуется вход');

    const userId = await this.sessions.resolve(sessionId);
    if (!userId) {
      throw new UnauthorizedException('Сессия истекла. Войдите заново');
    }

    req.userId = userId;
    req.sessionId = sessionId;
    return true;
  }
}
