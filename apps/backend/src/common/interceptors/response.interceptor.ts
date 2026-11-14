import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { Response } from 'express';
import type { ApiEnvelope } from '@reshis-avia/shared';

// Успешные ответы оборачиваем в { data, error: null }. Ошибки оборачивает AllExceptionsFilter.
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiEnvelope<T> | undefined
> {
  intercept(
    ctx: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiEnvelope<T> | undefined> {
    const res = ctx.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((data) => {
        if (res.statusCode === 204) return undefined;
        return { data: (data ?? null) as T | null, error: null };
      }),
    );
  }
}
