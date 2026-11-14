import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { API_PREFIX } from '@reshis-avia/shared';

// Используется и в main.ts, и в e2e, чтобы тесты шли на той же конфигурации, что прод.
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService);

  app.disable('x-powered-by');
  app.use(cookieParser());

  const hops = Number(config.get<string>('TRUST_PROXY_HOPS', '0'));
  if (hops > 0) app.set('trust proxy', hops);

  app.setGlobalPrefix(API_PREFIX.replace(/^\//, ''));

  // Лишние поля в теле запроса считаются ошибкой, а не отбрасываются молча.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const origins = config
    .get<string>('CORS_ORIGIN', 'http://localhost:3500')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });
}
