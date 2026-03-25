import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthService } from './services/auth.service';
import { RefreshSessionService } from './services/refresh-session.service';
import { AuthGuard } from './auth.guard';
import { AuthController } from './controllers/auth.controller';
import { RefreshSession } from './models/refresh-session.model';
import { UsersModule } from '@/modules/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    UsersModule,
    SequelizeModule.forFeature([RefreshSession]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  providers: [
    AuthService,
    RefreshSessionService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, RefreshSessionService],
})
export class AuthModule {}
