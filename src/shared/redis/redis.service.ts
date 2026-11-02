import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface StreamEntry {
  id: string;
  fields: Record<string, string>;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
      password: this.configService.get<string>('REDIS_PASSWORD'),
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis connection error', err);
    });
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async publishToStream(stream: string, fields: Record<string, string>): Promise<string> {
    const flatFields = Object.entries(fields).flat();
    const entryId = await this.client.xadd(stream, '*', ...flatFields);
    // EntryId should never be null here -> safety check
    if (entryId === null) {
      throw new Error(`XADD on stream "${stream}" unexpectedly returned null`);
    }
    return entryId;
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /**
   * Crée le consumer group s'il n'existe pas déjà (idempotent : l'erreur Redis
   * BUSYGROUP signifie juste "déjà créé", on l'ignore). '0' = lit depuis le début
   * du stream, MKSTREAM = crée le stream lui-même s'il n'existe pas encore.
   */
  async ensureConsumerGroup(stream: string, group: string): Promise<void> {
    try {
      await this.client.xgroup('CREATE', stream, group, '0', 'MKSTREAM');
    } catch (err) {
      if (err instanceof Error && err.message.includes('BUSYGROUP')) return;
      throw err;
    }
  }

  /** Lit les nouvelles entrées du stream (jamais livrées à ce consumer group), en bloquant jusqu'à `blockMs`. */
  async readNewStreamEntries(
    stream: string,
    group: string,
    consumer: string,
    blockMs: number,
  ): Promise<StreamEntry[]> {
    const result = await this.client.xreadgroup(
      'GROUP',
      group,
      consumer,
      'BLOCK',
      blockMs,
      'STREAMS',
      stream,
      '>',
    );
    return this.parseStreamResult(result);
  }

  /**
   * Relit les entrées déjà livrées à ce consumer mais jamais ackées (sa Pending Entries
   * List), sans en bloquer de nouvelles : permet de retenter les entrées en échec à
   * chaque itération de la boucle, et de rattraper au redémarrage celles laissées en
   * plan par un crash précédent (le nom de consumer est partagé par toutes les instances
   * du service, donc leur Pending Entries List est commune).
   */
  async readPendingStreamEntries(
    stream: string,
    group: string,
    consumer: string,
  ): Promise<StreamEntry[]> {
    const result = await this.client.xreadgroup('GROUP', group, consumer, 'STREAMS', stream, '0');
    return this.parseStreamResult(result);
  }

  async ackStreamEntry(stream: string, group: string, id: string): Promise<void> {
    await this.client.xack(stream, group, id);
  }

  private parseStreamResult(result: unknown): StreamEntry[] {
    if (!result) return [];
    const streams = result as [string, [string, string[]][]][];
    const entries = streams[0]?.[1] ?? [];
    return entries.map(([id, flatFields]) => ({
      id,
      fields: this.flatFieldsToObject(flatFields),
    }));
  }

  private flatFieldsToObject(flatFields: string[]): Record<string, string> {
    const fields: Record<string, string> = {};
    for (let i = 0; i < flatFields.length; i += 2) {
      fields[flatFields[i]] = flatFields[i + 1];
    }
    return fields;
  }
}
