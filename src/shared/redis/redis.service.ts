import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST') ?? 'koudmain-redis',
      port: this.configService.get<number>('REDIS_PORT') ?? 6379,
      password: this.configService.get<string>('REDIS_PASSWORD'),
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis connection error', err);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  /**
   * Stocke une valeur avec un TTL en secondes.
   */
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  /**
   * Récupère une valeur. Retourne null si absente ou expirée.
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Supprime une clé.
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
