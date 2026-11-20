import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { initializeApp, cert, type App } from 'firebase-admin/app';
import * as apn from '@parse/node-apn';
import { DeviceToken } from '@/modules/push/models/device-token.model';
import { DeviceTokenService } from '@/modules/push/services/device-token.service';
import { PushService } from '@/modules/push/services/push.service';
import { DeviceTokenController } from '@/modules/push/controllers/device-token.controller';
import { FIREBASE_APP, APNS_PROVIDER } from '@/modules/push/push.constants';

@Module({
  imports: [SequelizeModule.forFeature([DeviceToken])],
  controllers: [DeviceTokenController],
  providers: [
    {
      provide: FIREBASE_APP,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): App => {
        const serviceAccountJson = configService.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
        if (!serviceAccountJson) {
          throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
        }

        return initializeApp({
          credential: cert(JSON.parse(serviceAccountJson)),
        });
      },
    },
    {
      provide: APNS_PROVIDER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): apn.Provider => {
        const key = configService.get<string>('APNS_KEY');
        const keyId = configService.get<string>('APNS_KEY_ID');
        const teamId = configService.get<string>('APNS_TEAM_ID');

        if (!key) throw new Error('Missing APNS_KEY');
        if (!keyId) throw new Error('Missing APNS_KEY_ID');
        if (!teamId) throw new Error('Missing APNS_TEAM_ID');

        return new apn.Provider({
          token: { key, keyId, teamId },
          production: configService.get<string>('APNS_PRODUCTION') === 'true',
        });
      },
    },
    DeviceTokenService,
    PushService,
  ],
  exports: [DeviceTokenService, PushService],
})
export class PushModule {}
