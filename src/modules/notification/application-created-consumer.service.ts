import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisService, StreamEntry } from '@/shared/redis/redis.service';
import { OutboxEventType } from '@/modules/application/models/outbox-event.model';
import { NotificationService } from './notification.service';

const STREAM_KEY = 'outbox-events';
const GROUP_NAME = 'notification-service';
// Nom de consumer partagé par toutes les instances (pas un nom par instance) : leur
// Pending Entries List est donc commune, ce qui permet à n'importe quelle instance de
// reprendre les événements laissés en plan par une instance qui a crashé.
const CONSUMER_NAME = 'notification-service';
const BLOCK_MS = 5_000;
const RETRY_DELAY_MS = 2_000;
const MAX_DELIVERY_ATTEMPTS = 5;

interface ApplicationCreatedPayload {
  publicationId: number;
  applicationId: number;
}

/**
 * Consomme le stream Redis outbox-events (événements APPLICATION_CREATED) et déclenche
 * la décision de notification.
 *
 * À chaque itération, on relit d'abord la Pending Entries List (entrées déjà livrées
 * mais jamais ackées, suite à un échec précédent ou à un crash) avant de bloquer sur de
 * nouvelles entrées : un échec est donc retenté en continu, sans attendre un redémarrage.
 * XPENDING n'incrémente pas son compteur de livraison sur une relecture via l'ID "0"
 * (relecture "sans effet de bord" selon la doc Redis) : on compte donc les tentatives
 * nous-mêmes, en mémoire, pour détecter un message "poison" et ne pas bloquer le stream
 * indéfiniment dessus.
 */
@Injectable()
export class ApplicationCreatedConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ApplicationCreatedConsumerService.name);
  private readonly deliveryAttempts = new Map<string, number>();
  private isDestroyed = false;
  private loopPromise?: Promise<void>;

  constructor(
    private readonly redisService: RedisService,
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    await this.redisService.ensureConsumerGroup(STREAM_KEY, GROUP_NAME);
    this.loopPromise = this.runLoop();
  }

  async onModuleDestroy() {
    this.isDestroyed = true;
    await this.loopPromise;
  }

  private async runLoop(): Promise<void> {
    while (!this.isDestroyed) {
      try {
        const pending = await this.redisService.readPendingStreamEntries(
          STREAM_KEY,
          GROUP_NAME,
          CONSUMER_NAME,
        );
        if (pending.length > 0) {
          for (const entry of pending) {
            await this.handleEntry(entry);
          }
          continue; // re-vérifie la pending list avant de bloquer sur de nouvelles entrées
        }

        const entries = await this.redisService.readNewStreamEntries(
          STREAM_KEY,
          GROUP_NAME,
          CONSUMER_NAME,
          BLOCK_MS,
        );
        for (const entry of entries) {
          await this.handleEntry(entry);
        }
      } catch (err) {
        this.logger.error('Error consuming outbox-events stream', err);
        await this.sleep(RETRY_DELAY_MS);
      }
    }
  }

  private async handleEntry(entry: StreamEntry): Promise<void> {
    try {
      if (entry.fields.type === OutboxEventType.APPLICATION_CREATED) {
        const payload = JSON.parse(entry.fields.payload) as ApplicationCreatedPayload;
        await this.notificationService.handleApplicationCreated(
          payload.publicationId,
          payload.applicationId,
        );
      }
      await this.redisService.ackStreamEntry(STREAM_KEY, GROUP_NAME, entry.id);
      this.deliveryAttempts.delete(entry.id);
    } catch (err) {
      const attempts = (this.deliveryAttempts.get(entry.id) ?? 0) + 1;

      if (attempts >= MAX_DELIVERY_ATTEMPTS) {
        this.logger.error(
          `Giving up on outbox-events entry ${entry.id} after ${attempts} attempts, acking to unblock the stream`,
          err,
        );
        await this.redisService.ackStreamEntry(STREAM_KEY, GROUP_NAME, entry.id);
        this.deliveryAttempts.delete(entry.id);
        return;
      }

      this.deliveryAttempts.set(entry.id, attempts);
      this.logger.error(
        `Failed to process outbox-events entry ${entry.id} (attempt ${attempts})`,
        err,
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
