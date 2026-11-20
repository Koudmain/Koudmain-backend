import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { NotificationDelivery } from '@/modules/application/models/notification-delivery.model';
import { CreateNotificationDeliveryDto } from '@/modules/internal/dto/create-notification-delivery.dto';

@Injectable()
export class NotificationDeliveryService {
  constructor(
    @InjectModel(NotificationDelivery)
    private readonly notificationDeliveryModel: typeof NotificationDelivery,
  ) {}

  async create(dto: CreateNotificationDeliveryDto): Promise<NotificationDelivery> {
    return this.notificationDeliveryModel.create({
      outboxEventId: dto.outboxEventId,
      applicationId: dto.applicationId ?? null,
      userId: dto.userId,
      platform: dto.platform,
      channel: dto.channel,
      status: dto.status,
      errorMessage: dto.errorMessage ?? null,
      createdAt: new Date(),
    });
  }
}
