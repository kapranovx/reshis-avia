import request from 'supertest';
import { API_PREFIX } from '@reshis-avia/shared';
import { HealthController } from '../src/modules/health/health.controller';
import { createTestApp, data, type TestContext } from './helpers';

const P = API_PREFIX;

// Запросы идут с loopback, то есть как изнутри контейнера.
// Внешний запрос имитируем заголовком X-Forwarded-For, как от Caddy.
describe('Здоровье', () => {
  let ctx: TestContext;
  const outside = { 'X-Forwarded-For': '203.0.113.7' };

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(() => {
    // Сбрасываем закешированную пробу от предыдущего теста.
    Reflect.set(ctx.app.get(HealthController), 'last', null);
  });

  function redisDown() {
    return jest
      .spyOn(ctx.redis.client, 'ping')
      .mockRejectedValue(new Error('connection lost'));
  }

  it('снаружи отвечает только статусом', async () => {
    const res = await request(ctx.server)
      .get(`${P}/health`)
      .set(outside)
      .expect(200);
    expect(data(res)).toEqual({ status: 'ok' });
  });

  it('снаружи при упавшем Redis отвечает 503 и не называет его', async () => {
    const ping = redisDown();
    try {
      const res = await request(ctx.server)
        .get(`${P}/health`)
        .set(outside)
        .expect(503);
      expect(res.text).not.toContain('"redis"');
      expect(res.text).not.toContain('"db"');
    } finally {
      ping.mockRestore();
    }
  });

  it('изнутри называет базу и Redis', async () => {
    const res = await request(ctx.server).get(`${P}/health`).expect(200);
    expect(res.text).toContain('"db":"up","redis":"up"');
  });

  it('изнутри при упавшем Redis отвечает 200: процесс жив', async () => {
    const ping = redisDown();
    try {
      const res = await request(ctx.server).get(`${P}/health`).expect(200);
      expect(res.text).toContain('"db":"up","redis":"down"');
    } finally {
      ping.mockRestore();
    }
  });

  it('поток запросов не превращается в поток проб базы и Redis', async () => {
    const ping = jest.spyOn(ctx.redis.client, 'ping');
    try {
      for (let i = 0; i < 5; i++) {
        await request(ctx.server).get(`${P}/health`).set(outside).expect(200);
      }
      expect(ping).toHaveBeenCalledTimes(1);
    } finally {
      ping.mockRestore();
    }
  });
});
