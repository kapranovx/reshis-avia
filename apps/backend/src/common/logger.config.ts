import { RequestMethod } from '@nestjs/common';
import { Params } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';

export const loggerConfig: Params = {
  forRoutes: [{ path: '{*path}', method: RequestMethod.ALL }],
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? 'info',
    autoLogging: true,
    // Чужой x-request-id принимаем только в разумном формате: он попадает и в лог, и в ответ.
    genReqId: (req) => {
      const supplied = req.headers['x-request-id'];
      return typeof supplied === 'string' && /^[\w.-]{8,64}$/.test(supplied)
        ? supplied
        : randomUUID();
    },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, res, responseTime) =>
      `${req.method} ${req.url} -> ${res.statusCode} (${responseTime}ms)`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.url} -> ${res.statusCode} ${err.message}`,
    serializers: {
      req: (req: {
        id?: string;
        method?: string;
        url?: string;
        remoteAddress?: string;
      }) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        ip: req.remoteAddress,
      }),
      res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
      ],
      censor: '[redacted]',
    },
    // В тестах pino-pretty не включаем: Jest не закрывает его воркер, и процесс зависает.
    // Смотрим на JEST_WORKER_ID, а не NODE_ENV, потому что файл читается раньше, чем ConfigModule загрузит .env.
    transport:
      process.env.NODE_ENV !== 'production' &&
      process.env.NODE_ENV !== 'test' &&
      process.env.JEST_WORKER_ID === undefined
        ? {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              translateTime: 'HH:MM:ss.l',
              ignore: 'pid,hostname,req,res,responseTime',
            },
          }
        : undefined,
  },
};
