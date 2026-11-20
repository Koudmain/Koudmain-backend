import { Test, TestingModule } from '@nestjs/testing';
import { Global, Module } from '@nestjs/common';
import { NotificationModule } from './notification.module';
import { ApplicationNotificationService } from './application/application-notification.service';
import { PushJobPublisherService } from './push-job-publisher.service';
import { OutboxStreamConsumerService } from './outbox-stream-consumer.service';
import { ApplicationCreatedHandler } from './application/application-created.handler';
import { OUTBOX_EVENT_HANDLERS } from './notification.constants';
import { RedisService } from '@/shared/redis/redis.service';

@Global()
@Module({
  providers: [
    {
      provide: RedisService,
      useValue: { incr: jest.fn(), del: jest.fn(), publishToStream: jest.fn() },
    },
  ],
  exports: [RedisService],
})
class GlobalRedisMockModule {}

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

describe('NotificationModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [GlobalRedisMockModule, NotificationModule],
    }).compile();
  });

  it('le module doit être défini et charger correctement ses composants', () => {
    expect(moduleRef).toBeDefined();

    expect(
      moduleRef.get<ApplicationNotificationService>(ApplicationNotificationService),
    ).toBeInstanceOf(ApplicationNotificationService);
    expect(moduleRef.get<PushJobPublisherService>(PushJobPublisherService)).toBeInstanceOf(
      PushJobPublisherService,
    );
    expect(moduleRef.get<OutboxStreamConsumerService>(OutboxStreamConsumerService)).toBeInstanceOf(
      OutboxStreamConsumerService,
    );
    expect(moduleRef.get<ApplicationCreatedHandler>(ApplicationCreatedHandler)).toBeInstanceOf(
      ApplicationCreatedHandler,
    );
    expect(moduleRef.get(OUTBOX_EVENT_HANDLERS)).toEqual([
      moduleRef.get<ApplicationCreatedHandler>(ApplicationCreatedHandler),
    ]);
  });
});
