import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { API_PREFIX } from '@reshis-avia/shared';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  configureApp(app);

  const config = app.get(ConfigService);
  const isProd = config.get<string>('NODE_ENV') === 'production';

  // Swagger в проде не публикуем.
  if (!isProd) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('reshis-avia API')
        .setDescription('Прогноз продаж авиабилетов')
        .setVersion('0.1.0')
        .build(),
    );
    SwaggerModule.setup('docs', app, document);
  }

  const port = Number(config.get<string>('PORT', '3501'));
  // В Docker HOST=0.0.0.0, локально слушаем только loopback.
  const host = config.get<string>('HOST', '127.0.0.1');
  await app.listen(port, host);

  const logger = app.get(Logger);
  logger.log(`API: http://localhost:${port}${API_PREFIX}`);
  if (!isProd) logger.log(`Swagger: http://localhost:${port}/docs`);
}

void bootstrap();
