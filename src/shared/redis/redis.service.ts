import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface StreamEntry {
  id: string;
  fields: Record<string, string>;
}

export interface PendingStreamEntry {
  id: string;
  deliveryCount: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  // XREADGROUP BLOCK occupe sa connexion jusqu'à 5 s : sur `client`, il ferait attendre
  // toutes les autres commandes du process (OTP, XADD du relais, compteurs).
  private blockingClient!: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.client = this.createClient();
    this.blockingClient = this.createClient();
  }

  async onModuleDestroy() {
    await Promise.all([this.client?.quit(), this.blockingClient?.quit()]);
  }

  private createClient(): Redis {
    const client = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
      password: this.configService.get<string>('REDIS_PASSWORD'),
    });
    client.on('error', (err) => {
      this.logger.error('Redis connection error', err);
    });
    return client;
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
   * Créer un groupe pour garder en mémoire la lecture du dernier id
   * à travers plusieurs instances
   */
  async ensureConsumerGroup(stream: string, group: string): Promise<void> {
    try {
      await this.client.xgroup('CREATE', stream, group, '0', 'MKSTREAM');
    } catch (err) {
      if (err instanceof Error && err.message.includes('BUSYGROUP')) return;
      throw err;
    }
  }

  async readNewStreamEntries(
    stream: string,
    group: string,
    consumer: string,
    blockMs: number,
  ): Promise<StreamEntry[]> {
    const result = await this.blockingClient.xreadgroup(
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
   * Entrées lues mais pas encore ackées, tous consumers confondus, inactives depuis au
   * moins `minIdleMs` : échec de traitement, ou instance arrêtée en plein travail.
   * `deliveryCount` est tenu par Redis (+1 à chaque lecture / XCLAIM). Redis ≥ 6.2.
   */
  async getStalePendingEntries(
    stream: string,
    group: string,
    minIdleMs: number,
    count: number,
  ): Promise<PendingStreamEntry[]> {
    const result = (await this.client.xpending(
      stream,
      group,
      'IDLE',
      minIdleMs,
      '-',
      '+',
      count,
    )) as [string, string, number, number][];
    return result.map(([id, , , deliveryCount]) => ({ id, deliveryCount }));
  }

  /**
   * Prend la main sur ces entrées, seulement si elles sont toujours inactives depuis
   * `minIdleMs` : si une autre instance vient de les reprendre, elles ne sont pas renvoyées.
   */
  async claimStreamEntries(
    stream: string,
    group: string,
    consumer: string,
    minIdleMs: number,
    ids: string[],
  ): Promise<StreamEntry[]> {
    const entries = await this.client.xclaim(stream, group, consumer, minIdleMs, ...ids);
    return this.parseEntries(entries as [string, string[] | null][]);
  }

  async ackStreamEntry(stream: string, group: string, id: string): Promise<void> {
    await this.client.xack(stream, group, id);
  }

  private parseStreamResult(result: unknown): StreamEntry[] {
    if (!result) return [];
    const streams = result as [string, [string, string[] | null][]][];
    return this.parseEntries(streams[0]?.[1] ?? []);
  }

  private parseEntries(entries: [string, string[] | null][]): StreamEntry[] {
    return (
      entries
        // Entrée supprimée du stream entre-temps : plus rien à traiter.
        .filter((entry): entry is [string, string[]] => entry[1] !== null)
        .map(([id, flatFields]) => ({ id, fields: this.flatFieldsToObject(flatFields) }))
    );
  }

  private flatFieldsToObject(flatFields: string[]): Record<string, string> {
    const fields: Record<string, string> = {};
    for (let i = 0; i < flatFields.length; i += 2) {
      fields[flatFields[i]] = flatFields[i + 1];
    }
    return fields;
  }
}
