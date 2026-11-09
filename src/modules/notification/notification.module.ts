import { Module } from '@nestjs/common';
import { ApplicationModule } from '@/modules/application/application.module';
import { PublicationModule } from '@/modules/publication/publication.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { PushModule } from '@/modules/push/push.module';
import { NotificationService } from './notification.service';
import { PushDispatchService } from './push-dispatch.service';
import { ApplicationCreatedConsumerService } from './application-created-consumer.service';

@Module({
  imports: [ApplicationModule, PublicationModule, CompaniesModule, PushModule],
  providers: [NotificationService, PushDispatchService, ApplicationCreatedConsumerService],
  exports: [NotificationService],
})
export class NotificationModule {}
