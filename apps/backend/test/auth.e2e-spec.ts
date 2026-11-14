import request from 'supertest';
import { SESSION_COOKIE, type PublicUser } from '@reshis-avia/shared';
import { SESSION_TTL_SECONDS } from '../src/modules/auth/session.store';
import {
  P,
  STRONG_PASSWORD,
  createTestApp,
  data,
  envelope,
  resetState,
  sessionCookieOf,
  setCookiesOf,
  signUp,
  type TestContext,
} from './helpers';

describe('Аутентификация', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetState(ctx);
  });

  describe('регистрация', () => {
    it('создаёт аккаунт и сразу входит', async () => {
      const res = await request(ctx.server)
        .post(`${P}/auth/signup`)
        .send({
          name: 'Анна',
          email: 'anna@example.com',
          password: STRONG_PASSWORD,
        })
        .expect(201);

      const user = data<PublicUser>(res);
      expect(user).toMatchObject({ name: 'Анна', email: 'anna@example.com' });

      const cookie = sessionCookieOf(res);
      expect(cookie).not.toBeNull();
      const me = await request(ctx.server)
        .get(`${P}/auth/me`)
        .set('Cookie', cookie!)
        .expect(200);
      expect(data<PublicUser>(me).id).toBe(user.id);
    });

    it('никогда не отдаёт хеш пароля', async () => {
      const { cookie } = await signUp(ctx.server);
      const me = await request(ctx.server)
        .get(`${P}/auth/me`)
        .set('Cookie', cookie)
        .expect(200);
      expect(me.text).not.toMatch(/passwordHash|argon2/);
    });

    it('ставит куку httpOnly с SameSite=Lax на весь сайт', async () => {
      const res = await request(ctx.server)
        .post(`${P}/auth/signup`)
        .send({
          name: 'Анна',
          email: 'anna@example.com',
          password: STRONG_PASSWORD,
        })
        .expect(201);

      const header = setCookiesOf(res).find((c) =>
        c.startsWith(`${SESSION_COOKIE}=`),
      );
      expect(header).toMatch(/HttpOnly/i);
      expect(header).toMatch(/SameSite=Lax/i);
      expect(header).toMatch(/Path=\//);
    });

    it('приводит почту к нижнему регистру и обрезает пробелы', async () => {
      const { user } = await signUp(ctx.server, {
        email: '  Anna@Example.COM ',
      });
      expect(user.email).toBe('anna@example.com');
    });

    it('на занятый адрес отвечает 409 с понятным текстом', async () => {
      await signUp(ctx.server, { email: 'anna@example.com' });
      const res = await request(ctx.server)
        .post(`${P}/auth/signup`)
        .send({
          name: 'Анна',
          email: 'ANNA@example.com',
          password: STRONG_PASSWORD,
        })
        .expect(409);

      expect(envelope(res).error).toMatchObject({
        code: 'CONFLICT',
        message: 'Этот адрес уже зарегистрирован. Войдите или укажите другой',
      });
    });

    it('называет нарушенное правило пароля', async () => {
      const res = await request(ctx.server)
        .post(`${P}/auth/signup`)
        .send({ name: 'Анна', email: 'anna@example.com', password: 'qwerty12' })
        .expect(400);

      expect(envelope(res).error?.message).toBe('Нужна заглавная буква');
    });

    it('не принимает пароль, повторяющий почту', async () => {
      const res = await request(ctx.server)
        .post(`${P}/auth/signup`)
        .send({
          name: 'Анна',
          email: 'kosmonavt@example.com',
          password: 'Kosmonavt-2026',
        })
        .expect(400);

      expect(envelope(res).error?.message).toBe(
        'Пароль не должен повторять имя или почту',
      );
    });

    it('не принимает имя из одних пробелов', async () => {
      const res = await request(ctx.server)
        .post(`${P}/auth/signup`)
        .send({
          name: '   ',
          email: 'anna@example.com',
          password: STRONG_PASSWORD,
        })
        .expect(400);

      expect(envelope(res).error?.message).toBe('Укажите имя, до 80 символов');
    });

    it('отклоняет лишние поля и не пересказывает ошибку по-английски', async () => {
      const res = await request(ctx.server)
        .post(`${P}/auth/signup`)
        .send({
          name: 'Анна',
          email: 'anna@example.com',
          password: STRONG_PASSWORD,
          role: 'ADMIN',
        })
        .expect(400);

      expect(envelope(res).error?.message).toBe('Проверьте введённые данные');
      expect(res.text).not.toMatch(/should not exist/);
    });
  });

  describe('вход', () => {
    it('пускает с верным паролем при любом регистре адреса', async () => {
      const { user } = await signUp(ctx.server, { email: 'anna@example.com' });
      const res = await request(ctx.server)
        .post(`${P}/auth/login`)
        .send({ email: 'Anna@Example.com', password: STRONG_PASSWORD })
        .expect(200);

      expect(data<PublicUser>(res).id).toBe(user.id);
      expect(sessionCookieOf(res)).not.toBeNull();
    });

    it('одинаково отвечает на неверный пароль и на неизвестный адрес', async () => {
      await signUp(ctx.server, { email: 'anna@example.com' });

      const wrongPassword = await request(ctx.server)
        .post(`${P}/auth/login`)
        .send({ email: 'anna@example.com', password: 'Drugoy-parol-1' })
        .expect(401);
      const unknownEmail = await request(ctx.server)
        .post(`${P}/auth/login`)
        .send({ email: 'nobody@example.com', password: 'Drugoy-parol-1' })
        .expect(401);

      expect(envelope(wrongPassword).error?.message).toBe(
        'Неверная почта или пароль',
      );
      expect(envelope(unknownEmail).error?.message).toBe(
        envelope(wrongPassword).error?.message,
      );
    });

    it('ограничивает число попыток с одного адреса', async () => {
      const attempt = () =>
        request(ctx.server)
          .post(`${P}/auth/login`)
          .send({ email: 'nobody@example.com', password: 'Drugoy-parol-1' });

      for (let i = 0; i < 20; i += 1) await attempt().expect(401);
      const blocked = await attempt().expect(429);

      expect(envelope(blocked).error).toMatchObject({
        code: 'RATE_LIMITED',
        message: 'Слишком много запросов. Подождите минуту и попробуйте снова',
      });
    });
  });

  describe('сессия', () => {
    it('без куки отвечает 401', async () => {
      const res = await request(ctx.server).get(`${P}/auth/me`).expect(401);
      expect(envelope(res).error).toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Требуется вход',
      });
    });

    it('с выдуманным идентификатором отвечает 401', async () => {
      await request(ctx.server)
        .get(`${P}/auth/me`)
        .set('Cookie', `${SESSION_COOKIE}=${'a'.repeat(43)}`)
        .expect(401);
    });

    it('выход отзывает сессию сразу и удаляет куку', async () => {
      const { cookie } = await signUp(ctx.server);

      const res = await request(ctx.server)
        .post(`${P}/auth/logout`)
        .set('Cookie', cookie)
        .expect(204);
      expect(setCookiesOf(res).join(';')).toContain(`${SESSION_COOKIE}=;`);

      await request(ctx.server)
        .get(`${P}/auth/me`)
        .set('Cookie', cookie)
        .expect(401);
      expect(await ctx.redis.client.keys('sess:*')).toEqual([]);
    });

    it('выход без сессии тоже проходит', async () => {
      await request(ctx.server).post(`${P}/auth/logout`).expect(204);
    });

    it('каждое обращение продлевает срок сессии', async () => {
      const { cookie } = await signUp(ctx.server);
      const [key] = await ctx.redis.client.keys('sess:*');
      await ctx.redis.client.expire(key, 60);

      await request(ctx.server)
        .get(`${P}/auth/me`)
        .set('Cookie', cookie)
        .expect(200);

      expect(await ctx.redis.client.ttl(key)).toBeGreaterThan(
        SESSION_TTL_SECONDS - 60,
      );
    });
  });

  it('несуществующий адрес отвечает по-русски и не называет фреймворк', async () => {
    const res = await request(ctx.server).get(`${P}/nope`).expect(404);
    expect(envelope(res).error?.message).toBe('Не найдено');
    expect(res.text).not.toMatch(/Cannot GET/);
  });
});
