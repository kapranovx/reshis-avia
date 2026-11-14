import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import type { LoginDto, PublicUser, SignupDto } from '@reshis-avia/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionStore } from './session.store';
import { toPublicUser } from './user.mapper';

// Параметры argon2id по рекомендации OWASP.
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export interface AuthResult {
  sessionId: string;
  user: PublicUser;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

@Injectable()
export class AuthService {
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionStore,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResult> {
    const passwordHash = await argon2.hash(dto.password, ARGON2_OPTIONS);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: normalizeEmail(dto.email),
          name: dto.name,
          passwordHash,
        },
      });
      return {
        sessionId: await this.sessions.create(user.id),
        user: toPublicUser(user),
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Этот адрес уже зарегистрирован. Войдите или укажите другой',
        );
      }
      throw err;
    }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
    });

    // Для несуществующего email сверяем с фиктивным хешем,
    // чтобы по времени ответа нельзя было понять, есть ли такой пользователь.
    const valid = user
      ? await argon2.verify(user.passwordHash, dto.password)
      : await argon2.verify(await this.getDummyHash(), dto.password);

    if (!user || !valid) {
      throw new UnauthorizedException('Неверная почта или пароль');
    }
    return {
      sessionId: await this.sessions.create(user.id),
      user: toPublicUser(user),
    };
  }

  logout(sessionId: string): Promise<void> {
    return this.sessions.destroy(sessionId);
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Требуется вход');
    return toPublicUser(user);
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= argon2.hash('timing-equalizer', ARGON2_OPTIONS);
    return this.dummyHash;
  }
}
