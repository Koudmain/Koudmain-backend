import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('RedisService', () => {
  let service: RedisService;
  let mockRedisClient: jest.Mocked<Redis>;
  let mockBlockingClient: jest.Mocked<Redis>;

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

    // Une instance distincte par `new Redis()` pour distinguer la connexion bloquante
    (Redis as unknown as jest.Mock).mockImplementation(() => ({
      on: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK'),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue('mock-value'),
      del: jest.fn().mockResolvedValue(1),
      xadd: jest.fn().mockResolvedValue('1700000000000-0'),
      sadd: jest.fn().mockResolvedValue(1),
      scard: jest.fn().mockResolvedValue(1),
      xgroup: jest.fn().mockResolvedValue('OK'),
      xreadgroup: jest.fn().mockResolvedValue(null),
      xack: jest.fn().mockResolvedValue(1),
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
    mockBlockingClient = service['blockingClient'] as unknown as jest.Mocked<Redis>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should open a main and a dedicated blocking connection on module init', () => {
    expect(Redis).toHaveBeenCalledTimes(2);
    expect(Redis).toHaveBeenCalledWith({
      host: 'localhost',
      port: 6379,
      password: 'secret',
    });
    expect(mockBlockingClient).not.toBe(mockRedisClient);
    expect(jest.mocked(mockRedisClient.on)).toHaveBeenCalledWith('error', expect.any(Function));
    expect(jest.mocked(mockBlockingClient.on)).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should quit both connections on module destroy', async () => {
    await service.onModuleDestroy();
    expect(jest.mocked(mockRedisClient.quit)).toHaveBeenCalled();
    expect(jest.mocked(mockBlockingClient.quit)).toHaveBeenCalled();
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

  it('should call xadd with flattened fields and return the generated entry id', async () => {
    const result = await service.publishToStream('outbox-events', {
      id: '42',
      type: 'APPLICATION_CREATED',
    });
    expect(jest.mocked(mockRedisClient.xadd)).toHaveBeenCalledWith(
      'outbox-events',
      '*',
      'id',
      '42',
      'type',
      'APPLICATION_CREATED',
    );
    expect(result).toBe('1700000000000-0');
  });

  it('should add a member to a set and return the set size', async () => {
    (mockRedisClient.scard as jest.Mock).mockResolvedValueOnce(2);

    const result = await service.addToSet('publication:1:unseen_application_ids', '42');

    expect(jest.mocked(mockRedisClient.sadd)).toHaveBeenCalledWith(
      'publication:1:unseen_application_ids',
      '42',
    );
    expect(result).toBe(2);
  });

  it('should create the consumer group with MKSTREAM', async () => {
    await service.ensureConsumerGroup('outbox-events', 'notification-service');
    expect(jest.mocked(mockRedisClient.xgroup)).toHaveBeenCalledWith(
      'CREATE',
      'outbox-events',
      'notification-service',
      '0',
      'MKSTREAM',
    );
  });

  it('should silently ignore BUSYGROUP when the consumer group already exists', async () => {
    (mockRedisClient.xgroup as jest.Mock).mockRejectedValueOnce(
      new Error('BUSYGROUP Consumer Group name already exists'),
    );
    await expect(
      service.ensureConsumerGroup('outbox-events', 'notification-service'),
    ).resolves.not.toThrow();
  });

  it('should rethrow unexpected errors from xgroup', async () => {
    (mockRedisClient.xgroup as jest.Mock).mockRejectedValueOnce(new Error('connection refused'));
    await expect(
      service.ensureConsumerGroup('outbox-events', 'notification-service'),
    ).rejects.toThrow('connection refused');
  });

  it('should read new entries on the blocking connection, not the main one', async () => {
    (mockBlockingClient.xreadgroup as jest.Mock).mockResolvedValueOnce([
      ['outbox-events', [['1-0', ['type', 'APPLICATION_CREATED', 'payload', '{"id":1}']]]],
    ]);

    const result = await service.readNewStreamEntries(
      'outbox-events',
      'notification-service',
      'notification-service',
      5000,
    );

    expect(jest.mocked(mockBlockingClient.xreadgroup)).toHaveBeenCalledWith(
      'GROUP',
      'notification-service',
      'notification-service',
      'BLOCK',
      5000,
      'STREAMS',
      'outbox-events',
      '>',
    );
    expect(jest.mocked(mockRedisClient.xreadgroup)).not.toHaveBeenCalled();
    expect(result).toEqual([
      { id: '1-0', fields: { type: 'APPLICATION_CREATED', payload: '{"id":1}' } },
    ]);
  });

  it('should return an empty array when xreadgroup returns null', async () => {
    const result = await service.readNewStreamEntries(
      'outbox-events',
      'notification-service',
      'notification-service',
      5000,
    );
    expect(result).toEqual([]);
  });

  it('should read the pending entries list with id "0"', async () => {
    await service.readPendingStreamEntries(
      'outbox-events',
      'notification-service',
      'notification-service',
    );
    expect(jest.mocked(mockRedisClient.xreadgroup)).toHaveBeenCalledWith(
      'GROUP',
      'notification-service',
      'notification-service',
      'STREAMS',
      'outbox-events',
      '0',
    );
  });

  it('should call xack with the given entry id', async () => {
    await service.ackStreamEntry('outbox-events', 'notification-service', '1-0');
    expect(jest.mocked(mockRedisClient.xack)).toHaveBeenCalledWith(
      'outbox-events',
      'notification-service',
      '1-0',
    );
  });
});
