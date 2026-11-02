import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/shared/redis/redis.service';

/**
 * Décide quoi faire d'une nouvelle candidature côté notification : compteur de
 * candidatures non vues par publication, et distinction premier envoi (push immédiat)
 * vs mise à jour (notification existante remplacée, compteur incrémenté).
 *
 * L'envoi effectif (push FCM/APNs, WebSocket) est branché par KDM-140/KDM-141 ; pour
 * l'instant cette décision est juste loggée.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly redisService: RedisService) {}

  async handleApplicationCreated(publicationId: number, applicationId: number): Promise<void> {
    const unseenCount = await this.redisService.incr(this.unseenCountKey(publicationId));
    const isFirstUnseen = unseenCount === 1;

    this.logger.log(
      isFirstUnseen
        ? `Publication ${publicationId}: première candidature non vue (application ${applicationId}) -> push immédiat`
        : `Publication ${publicationId}: candidature non vue supplémentaire (application ${applicationId}) -> mise à jour, unseenCount=${unseenCount}`,
    );
  }

  /** Remet le compteur à zéro quand l'employeur consulte la liste des candidatures de la publication. */
  async resetUnseenCount(publicationId: number): Promise<void> {
    await this.redisService.del(this.unseenCountKey(publicationId));
  }

  private unseenCountKey(publicationId: number): string {
    return `publication:${publicationId}:unseen_applications`;
  }
}
