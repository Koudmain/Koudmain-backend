import { Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

type RedisClientType = {
  publish(channel: string, message: string): Promise<number>;
};

type RedisConstructor = new (options: {
  host: string;
  port: number;
  password?: string;
}) => RedisClientType;

const RedisFactory = Redis as unknown as RedisConstructor;

@Injectable()
export class RedisPubService implements OnModuleInit {
  private redisClient!: RedisClientType;

  onModuleInit() {
    this.redisClient = new RedisFactory({
      host: process.env.REDIS_HOST || 'koudmain-redis',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
    });
  }

  async publishMessage(payload: any) {
    await this.redisClient.publish('chat:messages', JSON.stringify(payload));
  }
}
