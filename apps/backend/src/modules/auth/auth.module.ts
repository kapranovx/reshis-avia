import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './session-auth.guard';
import { SessionStore } from './session.store';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionStore, SessionAuthGuard],
  exports: [SessionStore, SessionAuthGuard],
})
export class AuthModule {}
