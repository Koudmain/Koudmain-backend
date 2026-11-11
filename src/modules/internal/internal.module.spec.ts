import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { Global, Module } from '@nestjs/common';
import { InternalModule } from './internal.module';
import { InternalController } from './controllers/internal.controller';
import { InternalAuthGuard } from './internal-auth.guard';
import { NotificationDeliveryService } from './services/notification-delivery.service';
import { DeviceToken } from '@/modules/push/models/device-token.model';
import { Application } from '@/modules/application/models/application.model';
import { OutboxEvent } from '@/modules/application/models/outbox-event.model';
import { NotificationDelivery } from '@/modules/application/models/notification-delivery.model';

@Global()
@Module({
  providers: [{ provide: ConfigService, useValue: { get: jest.fn() } }],
  exports: [ConfigService],
})
class GlobalConfigMockModule {}

describe('InternalModule', () => {
  it('le module doit être défini et charger correctement ses composants', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [GlobalConfigMockModule, InternalModule],
    })
      .overrideProvider(getModelToken(DeviceToken))
      .useValue({})
      .overrideProvider(getModelToken(Application))
      .useValue({})
      .overrideProvider(getModelToken(OutboxEvent))
      .useValue({})
      .overrideProvider(getModelToken(NotificationDelivery))
      .useValue({})
      .compile();

    expect(moduleRef.get<InternalController>(InternalController)).toBeInstanceOf(
      InternalController,
    );
    expect(moduleRef.get<InternalAuthGuard>(InternalAuthGuard)).toBeInstanceOf(InternalAuthGuard);
    expect(moduleRef.get<NotificationDeliveryService>(NotificationDeliveryService)).toBeInstanceOf(
      NotificationDeliveryService,
    );
  });
});
