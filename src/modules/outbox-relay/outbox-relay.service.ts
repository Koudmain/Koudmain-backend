import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { Sequelize, Transaction } from 'sequelize';
import { Client as PgClient } from 'pg';
import { RedisService } from '@/shared/redis/redis.service';
import { OutboxEvent, OutboxEventStatus } from '@/modules/application/models/outbox-event.model';
import { OUTBOX_STREAM_KEY } from '@/shared/outbox/outbox-stream.constants';

const NOTIFY_CHANNEL = 'outbox_event_created';
const BATCH_SIZE = 100;
const POLL_INTERVAL_MS = 20_000;
const LISTEN_RECONNECT_DELAY_MS = 5_000;

/**
 * Classe récupérant les entrés dans la table outbox_event
 * et les envoie en queue Redis
 */
@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private listenClient?: PgClient;
  private pollIntervalHandle?: NodeJS.Timeout;
  private isProcessing = false;
  private isDestroyed = false;

  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    @InjectModel(OutboxEvent) private readonly outboxEventModel: typeof OutboxEvent,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.connectListenClient();
    this.pollIntervalHandle = setInterval(() => {
      void this.relayPendingEvents();
    }, POLL_INTERVAL_MS);

    // Flush au start
    void this.relayPendingEvents();
  }

  async onModuleDestroy() {
    this.isDestroyed = true;
    clearInterval(this.pollIntervalHandle);
    await this.listenClient?.end();
  }

  private async connectListenClient(): Promise<void> {
    const client = new PgClient({
      host: this.configService.get<string>('DB_HOST'),
      port: this.configService.get<number>('DB_PORT'),
      user: this.configService.get<string>('DB_USER'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database: this.configService.get<string>('DB_NAME'),
    });

    client.on('notification', () => {
      void this.relayPendingEvents();
    });

    client.on('error', (err) => {
      this.logger.error('Postgres LISTEN connection error', err);
    });

    client.on('end', () => {
      if (this.isDestroyed) return;
      this.logger.warn('Postgres LISTEN connection closed, reconnecting...');
      setTimeout(() => void this.connectListenClient(), LISTEN_RECONNECT_DELAY_MS);
    });

    try {
      await client.connect();
      await client.query(`LISTEN ${NOTIFY_CHANNEL}`);
      this.listenClient = client;
    } catch (err) {
      this.logger.error('Failed to establish Postgres LISTEN connection, retrying...', err);
      setTimeout(() => void this.connectListenClient(), LISTEN_RECONNECT_DELAY_MS);
    }
  }

  /**
   * Batch system et lock des events en train d'être traités
   */
  async relayPendingEvents(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      let processedCount: number;
      do {
        processedCount = await this.relayBatch();
      } while (processedCount === BATCH_SIZE);
    } finally {
      this.isProcessing = false;
    }
  }

  private async relayBatch(): Promise<number> {
    return this.sequelize.transaction(async (transaction) => {
      const pendingEvents = await this.outboxEventModel.findAll({
        where: { status: OutboxEventStatus.PENDING },
        order: [['createdAt', 'ASC']],
        limit: BATCH_SIZE,
        transaction,
        lock: Transaction.LOCK.UPDATE,
        skipLocked: true,
      });

      for (const event of pendingEvents) {
        try {
          await this.redisService.publishToStream(OUTBOX_STREAM_KEY, {
            id: String(event.id),
            type: event.type,
            payload: JSON.stringify(event.payload),
            createdAt: event.createdAt.toISOString(),
          });

          event.status = OutboxEventStatus.PUBLISHED;
          event.publishedAt = new Date();
          await event.save({ transaction });
        } catch (err) {
          // L'événement sera traité à la prochaine boucle
          this.logger.error(`Failed to publish outbox event ${event.id} to Redis Streams`, err);
        }
      }

      return pendingEvents.length;
    });
  }
}
