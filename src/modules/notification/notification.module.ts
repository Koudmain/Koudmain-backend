import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApplicationCreatedConsumerService } from './application-created-consumer.service';

@Module({
  providers: [NotificationService, ApplicationCreatedConsumerService],
  exports: [NotificationService],
})
export class NotificationModule {}
