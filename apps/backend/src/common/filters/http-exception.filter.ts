import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import type { Request, Response } from 'express';
import type {
  ApiEnvelope,
  ApiErrorCode,
  ApiErrorPayload,
} from '@reshis-avia/shared';

// Не HttpException, но и не 500. Сюда попадают гонки в Prisma и битое тело запроса.
function softFailure(
  exception: unknown,
): { status: number; message: string } | null {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2002') {
      return {
        status: 409,
        message:
          'Это действие пересеклось с таким же, выполненным одновременно. Обновите страницу и проверьте результат',
      };
    }
    if (exception.code === 'P2025') {
      return { status: 404, message: 'Запись не найдена' };
    }
    return null;
  }

  if (exception && typeof exception === 'object') {
    const { type, status } = exception as { type?: unknown; status?: unknown };
    if (
      typeof type === 'string' &&
      typeof status === 'number' &&
      status >= 400 &&
      status < 500
    ) {
      return {
        status,
        message:
          status === 413
            ? 'Слишком большой запрос'
            : 'Сервер не смог разобрать запрос',
      };
    }
  }
  return null;
}

// Наши тексты на русском. Английские дефолты Nest и class-validator наружу не отдаём.
function ownText(message: string): boolean {
  return /[а-яё]/i.test(message);
}

function plainText(status: number): string {
  if (status === 404) return 'Не найдено';
  if (status === 401) return 'Требуется вход';
  if (status === 403) return 'Нет доступа';
  if (status === 409) return 'Данные изменились. Обновите страницу';
  if (status === 413) return 'Слишком большой файл или запрос';
  if (status === 415) return 'Такой формат не поддерживается';
  if (status === 429) return 'Слишком много запросов. Подождите минуту';
  return 'Проверьте введённые данные';
}

function ownMessage(payload: unknown): string | null {
  if (typeof payload === 'string') return ownText(payload) ? payload : null;
  if (payload && typeof payload === 'object') {
    const m: unknown = (payload as { message?: unknown }).message;
    const list = Array.isArray(m)
      ? m.map(String)
      : typeof m === 'string'
        ? [m]
        : [];
    return list.find(ownText) ?? null;
  }
  return null;
}

function statusToCode(status: number): ApiErrorCode {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 413) return 'PAYLOAD_TOO_LARGE';
  if (status === 422) return 'VALIDATION';
  if (status === 429) return 'RATE_LIMITED';
  return 'INTERNAL';
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext('Exception');
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();

    const soft =
      exception instanceof HttpException ? null : softFailure(exception);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : (soft?.status ?? HttpStatus.INTERNAL_SERVER_ERROR);

    const rawPayload: unknown =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: soft?.message ?? 'Internal server error' };

    if (soft) {
      this.logger.warn(
        { err: exception, path: req.url, method: req.method, status },
        'soft failure',
      );
    }

    // Детали 5xx пишем только в лог. Исключение для своих 503, там текст для пользователя.
    const ownUnavailable = exception instanceof ServiceUnavailableException;
    const message =
      status >= 500 && !ownUnavailable
        ? 'Внутренняя ошибка сервера'
        : (ownMessage(rawPayload) ?? plainText(status));

    if (status >= 500) {
      const stack =
        exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(
        { err: exception, stack, path: req.url, method: req.method },
        '5xx',
      );
    }

    const errorPayload: ApiErrorPayload = {
      code: statusToCode(status),
      message,
      requestId: req.id,
    };

    if (
      rawPayload &&
      typeof rawPayload === 'object' &&
      Array.isArray((rawPayload as { message?: unknown }).message)
    ) {
      errorPayload.details = (rawPayload as { message: unknown[] }).message
        .map(String)
        .filter(ownText);
      errorPayload.code = 'VALIDATION';
    }

    const envelope: ApiEnvelope<never> = { data: null, error: errorPayload };
    res.status(status).json(envelope);
  }
}
