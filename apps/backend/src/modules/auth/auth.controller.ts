import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { SESSION_COOKIE, type PublicUser } from '@reshis-avia/shared';
import { AuthRateLimit } from '../../common/throttle';
import { AuthService } from './auth.service';
import { CurrentUserId } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { SessionAuthGuard } from './session-auth.guard';
import {
  sessionCookieClearOptions,
  sessionCookieOptions,
  sessionIdOf,
} from './session-cookie';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly isProd: boolean;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    this.isProd = config.get<string>('NODE_ENV') === 'production';
  }

  @Post('signup')
  @AuthRateLimit()
  @ApiOperation({ summary: 'Регистрация: создаёт аккаунт и сразу входит' })
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const { sessionId, user } = await this.auth.signup(dto);
    res.cookie(SESSION_COOKIE, sessionId, sessionCookieOptions(this.isProd));
    return user;
  }

  @Post('login')
  @HttpCode(200)
  @AuthRateLimit()
  @ApiOperation({ summary: 'Вход по почте и паролю' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const { sessionId, user } = await this.auth.login(dto);
    res.cookie(SESSION_COOKIE, sessionId, sessionCookieOptions(this.isProd));
    return user;
  }

  /** Работает и с истёкшей сессией, кука удаляется в любом случае. */
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Выход: сессия отзывается сразу' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const sessionId = sessionIdOf(req);
    if (sessionId) await this.auth.logout(sessionId);
    res.clearCookie(SESSION_COOKIE, sessionCookieClearOptions(this.isProd));
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: 'Текущий пользователь' })
  me(@CurrentUserId() userId: string): Promise<PublicUser> {
    return this.auth.me(userId);
  }
}
