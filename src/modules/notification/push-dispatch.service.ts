import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { DeviceTokenService } from '@/modules/push/services/device-token.service';
import { PushService, PushPayload } from '@/modules/push/services/push.service';
import { DeviceToken } from '@/modules/push/models/device-token.model';
import {
  NotificationDelivery,
  NotificationChannel,
  NotificationDeliveryStatus,
} from '@/modules/application/models/notification-delivery.model';

export interface PushDispatchRequest {
  recipientUserIds: number[];
  payload: PushPayload;
  outboxEventId: number;
  applicationId?: number | null;
}

@Injectable()
export class PushDispatchService {
  private readonly logger = new Logger(PushDispatchService.name);

  constructor(
    private readonly deviceTokenService: DeviceTokenService,
    private readonly pushService: PushService,
    @InjectModel(NotificationDelivery)
    private readonly notificationDeliveryModel: typeof NotificationDelivery,
  ) {}

  async dispatch(request: PushDispatchRequest): Promise<void> {
    if (request.recipientUserIds.length === 0) {
      this.logger.log('Aucun destinataire résolu pour cette notification, push ignoré');
      return;
    }

    const deviceTokens = await this.deviceTokenService.getTokensByUserIds(request.recipientUserIds);
    if (deviceTokens.length === 0) {
      this.logger.log(
        'Aucun device token pour les destinataires de cette notification, push ignoré',
      );
      return;
    }

    for (const deviceToken of deviceTokens) {
      try {
        await this.sendToDevice(deviceToken, request);
      } catch (err) {
        this.logger.error(
          `Échec du push pour le device ${deviceToken.id} (utilisateur ${deviceToken.userId})`,
          err instanceof Error ? err.stack : err,
        );
      }
    }
  }

  private async sendToDevice(
    deviceToken: DeviceToken,
    request: PushDispatchRequest,
  ): Promise<void> {
    const result = await this.pushService.sendPush(deviceToken, request.payload);

    await this.notificationDeliveryModel.create({
      outboxEventId: request.outboxEventId,
      applicationId: request.applicationId ?? null,
      userId: deviceToken.userId,
      platform: deviceToken.platform,
      channel: NotificationChannel.PUSH,
      status: result.success ? NotificationDeliveryStatus.SENT : NotificationDeliveryStatus.FAILED,
      errorMessage: result.error ?? null,
      createdAt: new Date(),
    });

    if (result.invalidToken) {
      await this.deviceTokenService.removeToken(deviceToken.token);
    }
  }
}
