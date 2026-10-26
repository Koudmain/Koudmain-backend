import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Application } from './models/application.model';
import { OutboxEvent } from './models/outbox-event.model';
import { NotificationDelivery } from './models/notification-delivery.model';

@Module({
  imports: [SequelizeModule.forFeature([Application, OutboxEvent, NotificationDelivery])],
  exports: [SequelizeModule],
})
export class ApplicationModule {}
