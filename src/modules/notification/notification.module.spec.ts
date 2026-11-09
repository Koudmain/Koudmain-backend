import { Test, TestingModule } from '@nestjs/testing';
import { Global, Module } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { NotificationModule } from './notification.module';
import { NotificationService } from './notification.service';
import { PushDispatchService } from './push-dispatch.service';
import { ApplicationCreatedConsumerService } from './application-created-consumer.service';
import { RedisService } from '@/shared/redis/redis.service';
import { NotificationDelivery } from '@/modules/application/models/notification-delivery.model';

@Global()
@Module({
  providers: [{ provide: RedisService, useValue: { incr: jest.fn(), del: jest.fn() } }],
  exports: [RedisService],
})
class GlobalRedisMockModule {}

jest.mock('@/modules/application/application.module', () => {
  const { Module: nestModule } = jest.requireActual('@nestjs/common');
  const { NotificationDelivery: realNotificationDelivery } = jest.requireActual(
    '@/modules/application/models/notification-delivery.model',
  );
  const { getModelToken: realGetModelToken } = jest.requireActual('@nestjs/sequelize');

  @nestModule({
    providers: [{ provide: realGetModelToken(realNotificationDelivery), useValue: {} }],
    exports: [realGetModelToken(realNotificationDelivery)],
  })
  class InlineApplicationModule {}

  return { ApplicationModule: InlineApplicationModule };
});

jest.mock('@/modules/publication/publication.module', () => {
  const { Module: nestModule } = jest.requireActual('@nestjs/common');
  const { PublicationService: realPublicationService } = jest.requireActual(
    '@/modules/publication/services/publication.service',
  );

  @nestModule({
    providers: [{ provide: realPublicationService, useValue: { getById: jest.fn() } }],
    exports: [realPublicationService],
  })
  class InlinePublicationModule {}

  return { PublicationModule: InlinePublicationModule };
});

jest.mock('@/modules/companies/companies.module', () => {
  const { Module: nestModule } = jest.requireActual('@nestjs/common');
  const { CompaniesService: realCompaniesService } = jest.requireActual(
    '@/modules/companies/services/companies.service',
  );

  @nestModule({
    providers: [
      { provide: realCompaniesService, useValue: { getCompanyMemberUserIds: jest.fn() } },
    ],
    exports: [realCompaniesService],
  })
  class InlineCompaniesModule {}

  return { CompaniesModule: InlineCompaniesModule };
});

jest.mock('@/modules/push/push.module', () => {
  const { Module: nestModule } = jest.requireActual('@nestjs/common');
  const { DeviceTokenService: realDeviceTokenService } = jest.requireActual(
    '@/modules/push/services/device-token.service',
  );
  const { PushService: realPushService } = jest.requireActual(
    '@/modules/push/services/push.service',
  );

  @nestModule({
    providers: [
      {
        provide: realDeviceTokenService,
        useValue: { getTokensByUserIds: jest.fn(), removeToken: jest.fn() },
      },
      { provide: realPushService, useValue: { sendPush: jest.fn() } },
    ],
    exports: [realDeviceTokenService, realPushService],
  })
  class InlinePushModule {}

  return { PushModule: InlinePushModule };
});

describe('NotificationModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [GlobalRedisMockModule, NotificationModule],
    }).compile();
  });

  it('le module doit être défini et charger correctement ses composants', () => {
    expect(moduleRef).toBeDefined();

    expect(moduleRef.get<NotificationService>(NotificationService)).toBeInstanceOf(
      NotificationService,
    );
    expect(moduleRef.get<PushDispatchService>(PushDispatchService)).toBeInstanceOf(
      PushDispatchService,
    );
    expect(
      moduleRef.get<ApplicationCreatedConsumerService>(ApplicationCreatedConsumerService),
    ).toBeInstanceOf(ApplicationCreatedConsumerService);
    expect(moduleRef.get(getModelToken(NotificationDelivery))).toBeDefined();
  });
});
