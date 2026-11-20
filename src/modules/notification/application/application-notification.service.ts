import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/shared/redis/redis.service';
import { PublicationService } from '@/modules/publication/services/publication.service';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { PushDispatchService } from '@/modules/notification/push-dispatch.service';

@Injectable()
export class ApplicationNotificationService {
  private readonly logger = new Logger(ApplicationNotificationService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly publicationService: PublicationService,
    private readonly companiesService: CompaniesService,
    private readonly pushDispatchService: PushDispatchService,
  ) {}

  async handleApplicationCreated(
    publicationId: number,
    applicationId: number,
    outboxEventId: number,
  ): Promise<void> {
    const unseenCount = await this.redisService.incr(this.unseenCountKey(publicationId));
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

    await this.pushDispatchService.dispatch({
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
    await this.redisService.del(this.unseenCountKey(publicationId));
  }

  private unseenCountKey(publicationId: number): string {
    return `publication:${publicationId}:unseen_applications`;
  }
}
