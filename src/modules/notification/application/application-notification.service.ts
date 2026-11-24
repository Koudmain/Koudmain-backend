import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/shared/redis/redis.service';
import { PublicationService } from '@/modules/publication/services/publication.service';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { PushJobPublisherService } from '@/modules/notification/push-job-publisher.service';

@Injectable()
export class ApplicationNotificationService {
  private readonly logger = new Logger(ApplicationNotificationService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly publicationService: PublicationService,
    private readonly companiesService: CompaniesService,
    private readonly pushJobPublisherService: PushJobPublisherService,
  ) {}

  async handleApplicationCreated(
    publicationId: number,
    applicationId: number,
    outboxEventId: number,
  ): Promise<void> {
    // Un ensemble d'ids et pas un compteur : un événement rejoué (échec plus bas, doublon
    // du relais, crash avant l'ack) ne compte pas deux fois la même candidature.
    const unseenCount = await this.redisService.addToSet(
      this.unseenKey(publicationId),
      String(applicationId),
    );
    const isFirstUnseen = unseenCount === 1;

    this.logger.log(
      isFirstUnseen
        ? `Publication ${publicationId}: première candidature non vue (application ${applicationId}) -> push immédiat`
        : `Publication ${publicationId}: candidature non vue supplémentaire (application ${applicationId}) -> mise à jour, unseenCount=${unseenCount}`,
    );

    const publication = await this.publicationService.getById(publicationId);
    if (!publication || !publication.companyId) {
      this.logger.warn(`Publication ${publicationId} introuvable ou sans entreprise, push ignoré`);
      return;
    }

    const recipientUserIds = await this.companiesService.getCompanyMemberUserIds(
      publication.companyId,
    );

    await this.pushJobPublisherService.publish({
      recipientUserIds,
      outboxEventId,
      applicationId,
      payload: {
        title: isFirstUnseen ? 'Nouvelle candidature' : 'Nouvelles candidatures',
        body: isFirstUnseen
          ? 'Vous avez reçu une nouvelle candidature'
          : `Vous avez ${unseenCount} candidatures non vues sur cette offre`,
        collapseId: `publication:${publicationId}`,
        data: { publicationId: String(publicationId) },
      },
    });
  }

  async resetUnseenCount(publicationId: number): Promise<void> {
    await this.redisService.del(this.unseenKey(publicationId));
  }

  async getUnseenCount(publicationId: number): Promise<number> {
    return this.redisService.setSize(this.unseenKey(publicationId));
  }

  // Nouveau nom : l'ancienne clé `unseen_applications` était un compteur (chaîne), un
  // SADD dessus échouerait en WRONGTYPE.
  private unseenKey(publicationId: number): string {
    return `publication:${publicationId}:unseen_application_ids`;
  }
}
