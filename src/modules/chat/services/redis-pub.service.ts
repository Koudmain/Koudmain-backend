import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisPubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubService.name);
  private redisClient!: Redis;

  constructor(@Optional() private readonly configService?: ConfigService) {}

  onModuleInit() {
    const host =
      this.configService?.get<string>('REDIS_HOST') || process.env.REDIS_HOST || 'koudmain-redis';
    const port =
      Number(this.configService?.get<number>('REDIS_PORT')) ||
      Number(process.env.REDIS_PORT) ||
      6379;
    const password =
      this.configService?.get<string>('REDIS_PASSWORD') || process.env.REDIS_PASSWORD || undefined;

    this.redisClient = new Redis({
      host,
      port,
      password,
      retryStrategy: (times) => Math.min(times * 100, 2000),
    });

    this.redisClient.on('error', (err) => {
      this.logger.warn(`Erreur de connexion Redis (${RedisPubService.name}): ${err.message}`);
    });
  }

  async onModuleDestroy() {
    try {
      await this.redisClient?.quit();
    } catch {
      this.redisClient?.disconnect();
    }
  }

  async publishMessage(payload: unknown): Promise<void> {
    try {
      if (this.redisClient) {
        await this.redisClient.publish('chat:messages', JSON.stringify(payload));
      }
    } catch (error) {
      this.logger.warn(
        `Échec de la publication Redis : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
