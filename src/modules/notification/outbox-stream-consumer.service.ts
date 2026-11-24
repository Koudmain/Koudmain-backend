import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisService, StreamEntry } from '@/shared/redis/redis.service';
import { OutboxEventType } from '@/modules/application/models/outbox-event.model';
import { OUTBOX_STREAM_KEY } from '@/shared/outbox/outbox-stream.constants';
import { OUTBOX_EVENT_HANDLERS } from '@/modules/notification/notification.constants';
import { OutboxEventHandler } from '@/modules/notification/outbox-event-handler.interface';

const GROUP_NAME = 'notification-service';
const CONSUMER_NAME = 'notification-service';
const BLOCK_MS = 5_000;
const RETRY_DELAY_MS = 2_000;
const MAX_DELIVERY_ATTEMPTS = 5;

@Injectable()
export class OutboxStreamConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxStreamConsumerService.name);
  private readonly deliveryAttempts = new Map<string, number>();
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
        const pending = await this.redisService.readPendingStreamEntries(
          OUTBOX_STREAM_KEY,
          GROUP_NAME,
          CONSUMER_NAME,
        );
        if (pending.length > 0) {
          for (const entry of pending) {
            await this.handleEntry(entry);
          }
          continue;
        }

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

  private async handleEntry(entry: StreamEntry): Promise<void> {
    try {
      const handler = this.handlersByType.get(entry.fields.type as OutboxEventType);
      if (handler) {
        const payload = JSON.parse(entry.fields.payload);
        await handler.handle(payload, Number(entry.fields.id));
      }
      await this.redisService.ackStreamEntry(OUTBOX_STREAM_KEY, GROUP_NAME, entry.id);
      this.deliveryAttempts.delete(entry.id);
    } catch (err) {
      const attempts = (this.deliveryAttempts.get(entry.id) ?? 0) + 1;

      if (attempts >= MAX_DELIVERY_ATTEMPTS) {
        this.logger.error(
          `Giving up on outbox-events entry ${entry.id} after ${attempts} attempts, acking to unblock the stream`,
          err,
        );
        await this.redisService.ackStreamEntry(OUTBOX_STREAM_KEY, GROUP_NAME, entry.id);
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
