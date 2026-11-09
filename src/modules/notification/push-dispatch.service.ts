import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PublicationService } from '@/modules/publication/services/publication.service';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { DeviceTokenService } from '@/modules/push/services/device-token.service';
import { PushService, PushPayload } from '@/modules/push/services/push.service';
import { DeviceToken } from '@/modules/push/models/device-token.model';
import {
  NotificationDelivery,
  NotificationChannel,
  NotificationDeliveryStatus,
} from '@/modules/application/models/notification-delivery.model';

export interface ApplicationCreatedNotification {
  publicationId: number;
  applicationId: number;
  outboxEventId: number;
  unseenCount: number;
  isFirstUnseen: boolean;
}

@Injectable()
export class PushDispatchService {
  private readonly logger = new Logger(PushDispatchService.name);

  constructor(
    private readonly publicationService: PublicationService,
    private readonly companiesService: CompaniesService,
    private readonly deviceTokenService: DeviceTokenService,
    private readonly pushService: PushService,
    @InjectModel(NotificationDelivery)
    private readonly notificationDeliveryModel: typeof NotificationDelivery,
  ) {}

  async dispatch(event: ApplicationCreatedNotification): Promise<void> {
    const publication = await this.publicationService.getById(event.publicationId);
    if (!publication || !publication.companyId) {
      this.logger.warn(
        `Publication ${event.publicationId} introuvable ou sans entreprise, push ignoré`,
      );
      return;
    }

    const userIds = await this.companiesService.getCompanyMemberUserIds(publication.companyId);
    if (userIds.length === 0) {
      this.logger.log(
        `Aucun utilisateur n'a été trouvé pour l'entreprise ${publication.companyId}, push ignoré`,
      );
      return;
    }

    const deviceTokens = await this.deviceTokenService.getTokensByUserIds(userIds);
    if (deviceTokens.length === 0) {
      this.logger.log(
        `Aucun device token pour les membres de l'entreprise ${publication.companyId}, push ignoré`,
      );
      return;
    }

    const payload: PushPayload = {
      title: event.isFirstUnseen ? 'Nouvelle candidature' : 'Nouvelles candidatures',
      body: event.isFirstUnseen
        ? 'Vous avez reçu une nouvelle candidature'
        : `Vous avez ${event.unseenCount} candidatures non vues sur cette offre`,
      collapseId: `publication:${event.publicationId}`,
      data: { publicationId: String(event.publicationId) },
    };

    // Send push to device
    for (const deviceToken of deviceTokens) {
      try {
        await this.sendToDevice(deviceToken, payload, event);
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
    payload: PushPayload,
    event: ApplicationCreatedNotification,
  ): Promise<void> {
    const result = await this.pushService.sendPush(deviceToken, payload);

    await this.notificationDeliveryModel.create({
      outboxEventId: event.outboxEventId,
      applicationId: event.applicationId,
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
