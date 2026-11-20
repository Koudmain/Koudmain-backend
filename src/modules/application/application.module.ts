import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Application } from './models/application.model';
import { OutboxEvent } from './models/outbox-event.model';
import { NotificationDelivery } from './models/notification-delivery.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { ApplicationService } from './services/application.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Application,
      OutboxEvent,
      NotificationDelivery,
      Publication,
      CompanyMember,
    ]),
  ],
  providers: [ApplicationService],
  exports: [SequelizeModule, ApplicationService],
})
export class ApplicationModule {}
