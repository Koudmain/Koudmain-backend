import { Test, TestingModule } from '@nestjs/testing';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/sequelize';
import { PushModule } from './push.module';
import { DeviceToken } from './models/device-token.model';
import { DeviceTokenService } from './services/device-token.service';
import { PushService } from './services/push.service';
import { DeviceTokenController } from './controllers/device-token.controller';

let configValuesRef: Record<string, string | undefined> = {};

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: { get: (key: string) => configValuesRef[key] },
    },
  ],
  exports: [ConfigService],
})
class GlobalConfigMockModule {}

jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn().mockReturnValue({}),
  cert: jest.fn(),
}));

jest.mock('@parse/node-apn', () => ({
  Provider: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  Notification: jest.fn(),
}));

describe('PushModule', () => {
  beforeEach(() => {
    configValuesRef = {
      FIREBASE_SERVICE_ACCOUNT_JSON: '{"project_id":"test"}',
      APNS_KEY: 'key',
      APNS_KEY_ID: 'key-id',
      APNS_TEAM_ID: 'team-id',
    };
  });

  const compileModule = async (): Promise<TestingModule> => {
    return Test.createTestingModule({
      imports: [GlobalConfigMockModule, PushModule],
    })
      .overrideProvider(getModelToken(DeviceToken))
      .useValue({})
      .compile();
  };

  it('le module doit être défini et charger correctement ses composants', async () => {
    const moduleRef = await compileModule();

    expect(moduleRef.get<DeviceTokenService>(DeviceTokenService)).toBeInstanceOf(
      DeviceTokenService,
    );
    expect(moduleRef.get<PushService>(PushService)).toBeInstanceOf(PushService);
    expect(moduleRef.get<DeviceTokenController>(DeviceTokenController)).toBeInstanceOf(
      DeviceTokenController,
    );
  });

  it('should throw during factory execution if FIREBASE_SERVICE_ACCOUNT_JSON is missing', async () => {
    configValuesRef.FIREBASE_SERVICE_ACCOUNT_JSON = undefined;
    await expect(compileModule()).rejects.toThrow('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  });

  it('should throw during factory execution if APNS_KEY is missing', async () => {
    configValuesRef.APNS_KEY = undefined;
    await expect(compileModule()).rejects.toThrow('Missing APNS_KEY');
  });
});
