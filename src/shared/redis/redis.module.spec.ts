import { Test, TestingModule } from '@nestjs/testing';
import { RedisModule } from './redis.module';
import { RedisService } from './redis.service';
import { ConfigModule } from '@nestjs/config';

describe('RedisModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), RedisModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide RedisService', () => {
    const service = module.get<RedisService>(RedisService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(RedisService);
  });
});
