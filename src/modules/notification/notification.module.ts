import { Module } from '@nestjs/common';
import { ApplicationModule } from '@/modules/application/application.module';
import { PublicationModule } from '@/modules/publication/publication.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { PushModule } from '@/modules/push/push.module';
import { PushDispatchService } from './push-dispatch.service';
import { OutboxStreamConsumerService } from './outbox-stream-consumer.service';
import { OUTBOX_EVENT_HANDLERS } from './notification.constants';
import { OutboxEventHandler } from './outbox-event-handler.interface';
import { ApplicationNotificationService } from './application/application-notification.service';
import { ApplicationCreatedHandler } from './application/application-created.handler';

@Module({
  imports: [ApplicationModule, PublicationModule, CompaniesModule, PushModule],
  providers: [
    PushDispatchService,
    OutboxStreamConsumerService,
    ApplicationNotificationService,
    ApplicationCreatedHandler,
    {
      provide: OUTBOX_EVENT_HANDLERS,
      inject: [ApplicationCreatedHandler],
      useFactory: (applicationCreatedHandler: ApplicationCreatedHandler): OutboxEventHandler[] => [
        applicationCreatedHandler,
      ],
    },
  ],
  exports: [ApplicationNotificationService],
})
export class NotificationModule {}
