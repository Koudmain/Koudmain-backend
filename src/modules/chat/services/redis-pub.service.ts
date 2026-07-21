import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisPubService implements OnModuleInit, OnModuleDestroy {
  private redisClient!: Redis;

  onModuleInit() {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'koudmain-redis',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
    });
    this.redisClient.on('error', () => undefined);
  }

  onModuleDestroy() {
    this.redisClient?.disconnect();
  }

  async publishMessage(payload: any) {
    await this.redisClient.publish('chat:messages', JSON.stringify(payload));
  }
}
