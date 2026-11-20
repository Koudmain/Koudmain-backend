import { Test } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { OutboxRelayService } from './outbox-relay.service';
import { OutboxEvent, OutboxEventStatus } from '@/modules/application/models/outbox-event.model';
import { RedisService } from '@/shared/redis/redis.service';

jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('OutboxRelayService', () => {
  let service: OutboxRelayService;
  let mockOutboxEventModel: { findAll: jest.Mock };
  let mockRedisService: { publishToStream: jest.Mock };
  let mockSequelize: { transaction: jest.Mock };

  const buildEvent = (overrides: Partial<OutboxEvent> = {}) =>
    ({
      id: 1,
      type: 'APPLICATION_CREATED',
      payload: { applicationId: 1 },
      status: OutboxEventStatus.PENDING,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      publishedAt: null,
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    }) as unknown as OutboxEvent;

  beforeEach(async () => {
    mockOutboxEventModel = { findAll: jest.fn().mockResolvedValue([]) };
    mockRedisService = { publishToStream: jest.fn().mockResolvedValue('1-0') };
    mockSequelize = {
      transaction: jest.fn((cb: (transaction: unknown) => Promise<unknown>) => cb({})),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OutboxRelayService,
        { provide: getModelToken(OutboxEvent), useValue: mockOutboxEventModel },
        { provide: getConnectionToken(), useValue: mockSequelize },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get<OutboxRelayService>(OutboxRelayService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should publish each pending event to the Redis stream and mark it as Published', async () => {
    const event = buildEvent();
    mockOutboxEventModel.findAll.mockResolvedValueOnce([event]).mockResolvedValueOnce([]);

    await service.relayPendingEvents();

    expect(mockRedisService.publishToStream).toHaveBeenCalledWith('outbox-events', {
      id: '1',
      type: 'APPLICATION_CREATED',
      payload: JSON.stringify({ applicationId: 1 }),
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(event.status).toBe(OutboxEventStatus.PUBLISHED);
    expect(event.publishedAt).toBeInstanceOf(Date);
    expect(event.save).toHaveBeenCalled();
  });

  it('should leave the event Pending and keep going when Redis publish fails', async () => {
    const failingEvent = buildEvent({ id: 1 });
    mockOutboxEventModel.findAll.mockResolvedValueOnce([failingEvent]).mockResolvedValueOnce([]);
    mockRedisService.publishToStream.mockRejectedValueOnce(new Error('redis down'));

    await expect(service.relayPendingEvents()).resolves.not.toThrow();

    expect(failingEvent.status).toBe(OutboxEventStatus.PENDING);
    expect(failingEvent.save).not.toHaveBeenCalled();
  });

  it('should drain successive full batches without waiting for another trigger', async () => {
    const batch1 = Array.from({ length: 100 }, (unusedValue, i) => buildEvent({ id: i + 1 }));
    const batch2 = [buildEvent({ id: 101 })];
    mockOutboxEventModel.findAll.mockResolvedValueOnce(batch1).mockResolvedValueOnce(batch2);

    await service.relayPendingEvents();

    // batch1 est plein (BATCH_SIZE) donc on relance un lot ; batch2 est partiel donc on arrête.
    expect(mockOutboxEventModel.findAll).toHaveBeenCalledTimes(2);
    expect(mockRedisService.publishToStream).toHaveBeenCalledTimes(101);
  });

  it('should not run two relay passes concurrently', async () => {
    let resolveFindAll: (value: OutboxEvent[]) => void = () => {};
    mockOutboxEventModel.findAll.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFindAll = resolve;
        }),
    );

    const firstCall = service.relayPendingEvents();
    const secondCall = service.relayPendingEvents();

    resolveFindAll([]);
    await Promise.all([firstCall, secondCall]);

    expect(mockOutboxEventModel.findAll).toHaveBeenCalledTimes(1);
  });
});
