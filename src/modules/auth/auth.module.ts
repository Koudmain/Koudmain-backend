import { forwardRef, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthService } from '@/modules/auth/services/auth.service';
import { RefreshSessionService } from '@/modules/auth/services/refresh-session.service';
import { EmailVerificationService } from '@/modules/auth/services/email-verification.service';
import { AuthGuard } from '@/modules/auth/auth.guard';
import { AuthController } from '@/modules/auth/controllers/auth.controller';
import { RefreshSession } from '@/modules/auth/models/refresh-session.model';
import { UsersModule } from '@/modules/users/users.module';
import { WorkersModule } from '@/modules/workers/workers.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { MailerModule } from '@/modules/mailer/mailer.module';
import { RedisModule } from '@/shared/redis/redis.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Address } from '@/modules/address/address.model';
import { CompanyJob } from '@/modules/companies/models/company-job.model';
import { WorkerJob } from '@/modules/workers/models/worker-job.model';
import { GeocodingService } from '@/common/utils/geocoding/geocoding.service';

@Module({
  imports: [
    UsersModule,
    WorkersModule,
    forwardRef(() => CompaniesModule),
    MailerModule,
    RedisModule,
    SequelizeModule.forFeature([RefreshSession, Address, CompanyJob, WorkerJob]),
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
    GeocodingService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, RefreshSessionService, JwtModule],
})
export class AuthModule {}
