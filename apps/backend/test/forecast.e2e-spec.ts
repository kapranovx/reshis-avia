import request from 'supertest';
import type { Forecast, RouteInfo } from '@reshis-avia/shared';
import {
  P,
  createTestApp,
  data,
  envelope,
  resetState,
  sessionCookieOf,
  signUp,
  type TestContext,
} from './helpers';

describe('Прогноз', () => {
  let ctx: TestContext;
  let cookie: string;

  const forecast = (query: Record<string, string | number>) =>
    request(ctx.server).get(`${P}/forecast`).query(query).set('Cookie', cookie);

  const valid = {
    origin: 'MOW',
    destination: 'AER',
    date: '2026-06-01',
    price: 9347,
  };

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetState(ctx);
    // Регистрация, затем отдельный вход: прогноз смотрим с куки входа.
    const user = await signUp(ctx.server);
    const login = await request(ctx.server)
      .post(`${P}/auth/login`)
      .send({ email: user.email, password: user.password })
      .expect(200);
    cookie = sessionCookieOf(login)!;
  });

  it('без сессии отвечает 401 и на прогноз, и на маршруты', async () => {
    const f = await request(ctx.server)
      .get(`${P}/forecast`)
      .query(valid)
      .expect(401);
    expect(envelope(f).error?.code).toBe('UNAUTHORIZED');
    await request(ctx.server).get(`${P}/routes`).expect(401);
  });

  it('отдаёт маршруты с городами и диапазоном дат', async () => {
    const res = await request(ctx.server)
      .get(`${P}/routes`)
      .set('Cookie', cookie)
      .expect(200);
    const routes = data<RouteInfo[]>(res);
    expect(routes).toHaveLength(5);
    expect(routes[0]).toEqual({
      route: 'MOW-AER',
      name: 'Москва — Сочи',
      origin: 'MOW',
      originName: 'Москва',
      destination: 'AER',
      destinationName: 'Сочи',
      basePrice: 9000,
      priceMin: 5400,
      priceMax: 18000,
      dateFrom: '2026-06-01',
      dateTo: '2026-07-01',
    });
  });

  it('после регистрации и входа считает прогноз по формуле кейса', async () => {
    const result = data<Forecast>(await forecast(valid).expect(200));
    expect(result).toMatchObject({
      route: 'MOW-AER',
      date: '2026-06-01',
      seats: 900,
      price: 9347,
      basePrice: 9000,
      priceOutOfRange: false,
      limitedBySeats: false,
    });
    expect(result.simple.wants).toBeCloseTo(726.073, 9);
    expect(result.scenarios).toHaveLength(9);
    expect(result.scenarios[4]).toMatchObject({
      quantile: 0.5,
      wants: result.simple.wants,
    });
  });

  it('принимает коды городов в любом регистре', async () => {
    await forecast({ ...valid, origin: 'mow', destination: 'aer' }).expect(200);
  });

  it('неизвестный маршрут и дата без рейса дают 404', async () => {
    const route = await forecast({ ...valid, destination: 'XXX' }).expect(404);
    expect(envelope(route).error?.message).toBe('Маршрут не найден');

    const date = await forecast({ ...valid, date: '2026-07-02' }).expect(404);
    expect(envelope(date).error?.message).toBe('На эту дату рейса нет');
  });

  it('плохие параметры дают 400 с понятным текстом', async () => {
    const negative = await forecast({ ...valid, price: -5 }).expect(400);
    expect(envelope(negative).error?.message).toBe(
      'Цена должна быть больше нуля',
    );

    const notNumber = await forecast({ ...valid, price: 'дорого' }).expect(400);
    expect(envelope(notNumber).error?.message).toBe('Укажите цену числом');

    const badDate = await forecast({ ...valid, date: '01.06.2026' }).expect(
      400,
    );
    expect(envelope(badDate).error?.message).toBe('Дата в формате ГГГГ-ММ-ДД');

    const noSuchDay = await forecast({ ...valid, date: '2026-02-30' }).expect(
      400,
    );
    expect(envelope(noSuchDay).error?.message).toBe(
      'Такой даты нет в календаре',
    );

    await forecast({ ...valid, extra: 1 }).expect(400);

    const noOrigin = await request(ctx.server)
      .get(`${P}/forecast`)
      .query({ destination: 'AER', date: '2026-06-01', price: 9000 })
      .set('Cookie', cookie)
      .expect(400);
    expect(envelope(noOrigin).error?.message).toBe('Укажите город отправления');
  });
});
