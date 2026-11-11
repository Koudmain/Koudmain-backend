import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/shared/redis/redis.service';
import { PUSH_JOBS_STREAM_KEY } from '@/shared/push/push-jobs-stream.constants';

export interface PushPayload {
  title: string;
  body: string;
  collapseId: string;
  data?: Record<string, string>;
}

export interface PushJob {
  recipientUserIds: number[];
  payload: PushPayload;
  outboxEventId: number;
  applicationId?: number | null;
}

/**
 * Publie les jobs de push sur le stream Redis consommé par Koudmain-worker,
 * qui se charge de l'envoi FCM/APNs.
 */
@Injectable()
export class PushJobPublisherService {
  private readonly logger = new Logger(PushJobPublisherService.name);

  constructor(private readonly redisService: RedisService) {}

  async publish(job: PushJob): Promise<void> {
    if (job.recipientUserIds.length === 0) {
      this.logger.log('Aucun destinataire résolu pour cette notification, push ignoré');
      return;
    }

    const entryId = await this.redisService.publishToStream(PUSH_JOBS_STREAM_KEY, {
      payload: JSON.stringify({
        recipientUserIds: job.recipientUserIds,
        payload: job.payload,
        outboxEventId: job.outboxEventId,
        applicationId: job.applicationId ?? null,
      }),
    });

    this.logger.log(
      `Push job ${entryId} publié sur "${PUSH_JOBS_STREAM_KEY}" (outboxEvent ${job.outboxEventId}, ${job.recipientUserIds.length} destinataire(s))`,
    );
  }
}
