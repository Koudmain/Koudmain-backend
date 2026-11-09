import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/shared/redis/redis.service';
import { PushDispatchService } from '@/modules/notification/push-dispatch.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly redisService: RedisService,
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

    await this.pushDispatchService.dispatch({
      publicationId,
      applicationId,
      outboxEventId,
      unseenCount,
      isFirstUnseen,
    });
  }

  async resetUnseenCount(publicationId: number): Promise<void> {
    await this.redisService.del(this.unseenCountKey(publicationId));
  }

  private unseenCountKey(publicationId: number): string {
    return `publication:${publicationId}:unseen_applications`;
  }
}
