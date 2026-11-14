import {
  Controller,
  Get,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

const PROBE_TIMEOUT_MS = 1_500;
// Ручка открыта всем, поэтому результат пробы кешируем на несколько секунд.
const PROBE_TTL_MS = 5_000;

type Probe = 'up' | 'down';

interface DependencyState {
  db: Probe;
  redis: Probe;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private last: { at: number; state: Promise<DependencyState> } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // Снаружи отвечаем только 200 или 503, без подробностей.
  // Изнутри контейнера (healthcheck Docker) всегда 200, пока жив процесс,
  // чтобы упавшая база не роняла весь стек.
  @Get()
  @ApiOperation({ summary: 'Работает ли сервис: база и Redis' })
  async check(
    @Req() req: Request,
  ): Promise<{ status: 'ok' } | ({ status: 'ok' } & DependencyState)> {
    const state = await this.dependencies();
    if (fromInside(req)) return { status: 'ok', ...state };
    if (state.db !== 'up' || state.redis !== 'up') {
      throw new ServiceUnavailableException('Сервис временно недоступен');
    }
    return { status: 'ok' };
  }

  private dependencies(): Promise<DependencyState> {
    const now = Date.now();
    if (!this.last || now - this.last.at >= PROBE_TTL_MS) {
      const state = Promise.all([
        probe(this.prisma.$queryRaw`SELECT 1`),
        probe(this.redis.client.ping()),
      ]).then(([db, redis]) => ({ db, redis }));
      this.last = { at: now, state };
    }
    return this.last.state;
  }
}

// Смотрим на адрес сокета, а не на req.ip: за прокси req.ip берётся из заголовка от клиента.
function fromInside(req: Request): boolean {
  const peer = req.socket.remoteAddress ?? '';
  const loopback =
    peer === '127.0.0.1' || peer === '::1' || peer === '::ffff:127.0.0.1';
  return loopback && req.headers['x-forwarded-for'] === undefined;
}

async function probe(work: Promise<unknown>): Promise<Probe> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      work,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('probe timeout')),
          PROBE_TIMEOUT_MS,
        );
      }),
    ]);
    return 'up';
  } catch {
    return 'down';
  } finally {
    if (timer) clearTimeout(timer);
  }
}
