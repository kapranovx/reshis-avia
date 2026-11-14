import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import {
  API_PREFIX,
  SESSION_COOKIE,
  type ApiEnvelope,
  type PublicUser,
} from '@reshis-avia/shared';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';

export const P = API_PREFIX;

export function envelope<T>(res: request.Response): ApiEnvelope<T> {
  return res.body as ApiEnvelope<T>;
}

export function data<T>(res: request.Response): T {
  const body = envelope<T>(res);
  if (body.data === null) {
    throw new Error(
      `Ожидались данные, пришла ошибка: ${JSON.stringify(body.error)}`,
    );
  }
  return body.data;
}

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  redis: RedisService;
  server: Server;
}

export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();

  return {
    app,
    prisma: app.get(PrismaService),
    redis: app.get(RedisService),
    server: app.getHttpServer(),
  };
}

export async function resetState(ctx: TestContext): Promise<void> {
  await ctx.prisma.user.deleteMany();
  await ctx.redis.client.flushdb();
}

export interface SignedUpUser {
  user: PublicUser;
  email: string;
  password: string;
  /** Готовое значение для заголовка Cookie. */
  cookie: string;
}

export const STRONG_PASSWORD = 'Kryl0-samoleta';

let counter = 0;

export async function signUp(
  server: Server,
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<SignedUpUser> {
  counter += 1;
  const body = {
    name: 'Анна',
    email: `user${counter}@example.com`,
    password: STRONG_PASSWORD,
    ...overrides,
  };
  const res = await request(server)
    .post(`${P}/auth/signup`)
    .send(body)
    .expect(201);

  const cookie = sessionCookieOf(res);
  if (!cookie) throw new Error('Регистрация не поставила куку сессии');
  return {
    user: data<PublicUser>(res),
    email: body.email,
    password: body.password,
    cookie,
  };
}

export function setCookiesOf(res: request.Response): string[] {
  const raw = res.headers['set-cookie'] as string[] | string | undefined;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export function sessionCookieOf(res: request.Response): string | null {
  const found = setCookiesOf(res).find((c) =>
    c.startsWith(`${SESSION_COOKIE}=`),
  );
  return found ? found.split(';')[0] : null;
}
