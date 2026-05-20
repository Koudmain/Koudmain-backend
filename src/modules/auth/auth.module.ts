import { forwardRef, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthService } from './services/auth.service';
import { RefreshSessionService } from './services/refresh-session.service';
import { EmailVerificationService } from './services/email-verification.service';
import { AuthGuard } from './auth.guard';
import { AuthController } from './controllers/auth.controller';
import { RefreshSession } from './models/refresh-session.model';
import { UsersModule } from '@/modules/users/users.module';
import { WorkersModule } from '@/modules/workers/workers.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { MailerModule } from '@/modules/mailer/mailer.module';
import { RedisModule } from '@/shared/redis/redis.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    UsersModule,
    WorkersModule,
    forwardRef(() => CompaniesModule),
    MailerModule,
    RedisModule,
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
    EmailVerificationService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, RefreshSessionService, JwtModule],
})
export class AuthModule {}
