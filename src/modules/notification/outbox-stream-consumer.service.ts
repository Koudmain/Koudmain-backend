import { hostname } from 'os';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisService, StreamEntry } from '@/shared/redis/redis.service';
import { OutboxEventType } from '@/modules/application/models/outbox-event.model';
import { OUTBOX_STREAM_KEY } from '@/shared/outbox/outbox-stream.constants';
import { OUTBOX_EVENT_HANDLERS } from '@/modules/notification/notification.constants';
import { OutboxEventHandler } from '@/modules/notification/outbox-event-handler.interface';

const GROUP_NAME = 'notification-service';
// Unique par instance : Redis tient la liste des entrées en cours (PEL) par nom de consumer.
// Un nom partagé faisait traiter la même entrée par deux instances (scaling, rolling deploy).
// shortcut: les noms des instances arrêtées restent listés dans XINFO CONSUMERS (sans effet),
// les nettoyer avec XGROUP DELCONSUMER si la liste devient gênante.
export const CONSUMER_NAME = `${hostname()}-${process.pid}`;
const BLOCK_MS = 5_000;
const RETRY_DELAY_MS = 2_000;
// Une entrée non ackée depuis ce délai (échec, ou instance arrêtée) est reprise par
// n'importe quelle instance : c'est aussi le délai entre deux tentatives.
const RETRY_AFTER_IDLE_MS = 30_000;
const RETRY_BATCH_SIZE = 10;
const MAX_DELIVERY_ATTEMPTS = 5;

@Injectable()
export class OutboxStreamConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxStreamConsumerService.name);
  private readonly handlersByType: Map<OutboxEventType, OutboxEventHandler>;
  private isDestroyed = false;
  private loopPromise?: Promise<void>;

  constructor(
    private readonly redisService: RedisService,
    @Inject(OUTBOX_EVENT_HANDLERS) handlers: OutboxEventHandler[],
  ) {
    this.handlersByType = new Map();
    for (const handler of handlers) {
      if (this.handlersByType.has(handler.eventType)) {
        throw new Error(
          `Plusieurs OutboxEventHandler enregistrés pour le type ${handler.eventType}`,
        );
      }
      this.handlersByType.set(handler.eventType, handler);
    }
  }

  async onModuleInit() {
    await this.redisService.ensureConsumerGroup(OUTBOX_STREAM_KEY, GROUP_NAME);
    this.loopPromise = this.runLoop();
  }

  async onModuleDestroy() {
    this.isDestroyed = true;
    await this.loopPromise;
  }

  private async runLoop(): Promise<void> {
    while (!this.isDestroyed) {
      try {
        if (await this.retryStaleEntries()) continue;

        const entries = await this.redisService.readNewStreamEntries(
          OUTBOX_STREAM_KEY,
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

  /**
   * Reprend les entrées non ackées depuis RETRY_AFTER_IDLE_MS, quelle que soit l'instance
   * qui les avait lues. Le nombre de tentatives vient de Redis : il survit aux redémarrages
   * et reste juste quand une entrée change d'instance.
   * @returns true s'il y avait des entrées à reprendre
   */
  private async retryStaleEntries(): Promise<boolean> {
    const stale = await this.redisService.getStalePendingEntries(
      OUTBOX_STREAM_KEY,
      GROUP_NAME,
      RETRY_AFTER_IDLE_MS,
      RETRY_BATCH_SIZE,
    );
    if (stale.length === 0) return false;

    const idsToRetry: string[] = [];
    for (const { id, deliveryCount } of stale) {
      if (deliveryCount >= MAX_DELIVERY_ATTEMPTS) {
        this.logger.error(
          `Giving up on outbox-events entry ${id} after ${deliveryCount} attempts, acking to unblock the stream`,
        );
        await this.redisService.ackStreamEntry(OUTBOX_STREAM_KEY, GROUP_NAME, id);
      } else {
        idsToRetry.push(id);
      }
    }

    if (idsToRetry.length > 0) {
      const entries = await this.redisService.claimStreamEntries(
        OUTBOX_STREAM_KEY,
        GROUP_NAME,
        CONSUMER_NAME,
        RETRY_AFTER_IDLE_MS,
        idsToRetry,
      );
      for (const entry of entries) {
        await this.handleEntry(entry);
      }
    }
    return true;
  }

  private async handleEntry(entry: StreamEntry): Promise<void> {
    try {
      const handler = this.handlersByType.get(entry.fields.type as OutboxEventType);
      if (handler) {
        const payload = JSON.parse(entry.fields.payload);
        await handler.handle(payload, Number(entry.fields.id));
      }
      await this.redisService.ackStreamEntry(OUTBOX_STREAM_KEY, GROUP_NAME, entry.id);
    } catch (err) {
      // Pas d'ack : l'entrée reste pending et sera reprise par retryStaleEntries.
      this.logger.error(
        `Failed to process outbox-events entry ${entry.id}, retry in ${RETRY_AFTER_IDLE_MS / 1000}s`,
        err,
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
