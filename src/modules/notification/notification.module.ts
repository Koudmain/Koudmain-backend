import { Module } from '@nestjs/common';
import { PublicationModule } from '@/modules/publication/publication.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { PushJobPublisherService } from './push-job-publisher.service';
import { OutboxStreamConsumerService } from './outbox-stream-consumer.service';
import { OUTBOX_EVENT_HANDLERS } from './notification.constants';
import { OutboxEventHandler } from './outbox-event-handler.interface';
import { ApplicationNotificationService } from './application/application-notification.service';
import { ApplicationCreatedHandler } from './application/application-created.handler';

@Module({
  imports: [PublicationModule, CompaniesModule],
  providers: [
    PushJobPublisherService,
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
