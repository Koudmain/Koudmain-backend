import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('RedisService', () => {
  let service: RedisService;
  let mockRedisClient: jest.Mocked<Redis>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'REDIS_HOST') return 'localhost';
      if (key === 'REDIS_PORT') return 6379;
      if (key === 'REDIS_PASSWORD') return 'secret';
      return null;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockOn = jest.fn();
    const mockQuit = jest.fn().mockResolvedValue('OK');
    const mockSet = jest.fn().mockResolvedValue('OK');
    const mockGet = jest.fn().mockResolvedValue('mock-value');
    const mockDel = jest.fn().mockResolvedValue(1);
    const mockIncr = jest.fn().mockResolvedValue(1);
    const mockExpire = jest.fn().mockResolvedValue(1);

    (Redis as unknown as jest.Mock).mockImplementation(() => ({
      on: mockOn,
      quit: mockQuit,
      set: mockSet,
      get: mockGet,
      del: mockDel,
      incr: mockIncr,
      expire: mockExpire,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);

    service.onModuleInit();
    mockRedisClient = service['client'] as unknown as jest.Mocked<Redis>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize redis client on module init', () => {
    expect(Redis).toHaveBeenCalledWith({
      host: 'localhost',
      port: 6379,
      password: 'secret',
    });
    expect(jest.mocked(mockRedisClient.on)).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should call quit on module destroy', async () => {
    await service.onModuleDestroy();
    expect(jest.mocked(mockRedisClient.quit)).toHaveBeenCalled();
  });

  it('should call set with correct arguments', async () => {
    await service.set('test-key', 'test-value', 3600);
    expect(jest.mocked(mockRedisClient.set)).toHaveBeenCalledWith(
      'test-key',
      'test-value',
      'EX',
      3600,
    );
  });

  it('should call get with correct arguments and return value', async () => {
    const result = await service.get('test-key');
    expect(jest.mocked(mockRedisClient.get)).toHaveBeenCalledWith('test-key');
    expect(result).toBe('mock-value');
  });

  it('should call del with correct arguments', async () => {
    await service.del('test-key');
    expect(jest.mocked(mockRedisClient.del)).toHaveBeenCalledWith('test-key');
  });

  it('should start the TTL on the first increment only', async () => {
    jest.mocked(mockRedisClient.incr).mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    await expect(service.incr('counter', 60)).resolves.toBe(1);
    await expect(service.incr('counter', 60)).resolves.toBe(2);

    expect(jest.mocked(mockRedisClient.expire)).toHaveBeenCalledTimes(1);
    expect(jest.mocked(mockRedisClient.expire)).toHaveBeenCalledWith('counter', 60);
  });
});
