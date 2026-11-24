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
    if (this.isDestroyed) return;

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
      // Le retry est planifié par le handler 'end' (pg l'émet aussi après un connect raté) :
      // en planifier un second ici doublerait les tentatives à chaque échec.
      void client.end();
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
    } catch (err) {
      // Appelé en `void` (poll, NOTIFY, démarrage) : sans ce catch, une erreur DB devient
      // un rejet non géré qui arrête le process. Le lot est rejoué au prochain passage.
      this.logger.error('Outbox relay pass failed, retrying on next poll', err);
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

      const publishedIds: number[] = [];
      for (const event of pendingEvents) {
        try {
          await this.redisService.publishToStream(OUTBOX_STREAM_KEY, {
            id: String(event.id),
            type: event.type,
            payload: JSON.stringify(event.payload),
            createdAt: event.createdAt.toISOString(),
          });
          publishedIds.push(event.id);
        } catch (err) {
          // Redis indisponible : inutile d'essayer les suivants, ils restent Pending
          // et seront repris au prochain passage (poll ou NOTIFY).
          this.logger.error(`Failed to publish outbox event ${event.id} to Redis Streams`, err);
          break;
        }
      }

      // Un seul UPDATE, et seulement pour ce qui est vraiment parti sur Redis : un save
      // en échec au milieu du lot annulait toute la transaction, et les événements déjà
      // publiés repassaient Pending (donc republiés au passage suivant).
      if (publishedIds.length > 0) {
        await this.outboxEventModel.update(
          { status: OutboxEventStatus.PUBLISHED, publishedAt: new Date() },
          { where: { id: publishedIds }, transaction },
        );
      }

      // 0 après un échec : arrête la boucle de relayPendingEvents au lieu de relire
      // aussitôt le même lot en continu tant que Redis refuse les XADD.
      return publishedIds.length === pendingEvents.length ? pendingEvents.length : 0;
    });
  }
}
