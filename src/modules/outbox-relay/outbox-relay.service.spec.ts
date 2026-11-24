import { Test } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { Client as PgClient } from 'pg';
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
  let mockOutboxEventModel: { findAll: jest.Mock; update: jest.Mock };
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
      ...overrides,
    }) as unknown as OutboxEvent;

  beforeEach(async () => {
    mockOutboxEventModel = {
      findAll: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue([1]),
    };
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
    expect(mockOutboxEventModel.update).toHaveBeenCalledWith(
      { status: OutboxEventStatus.PUBLISHED, publishedAt: expect.any(Date) },
      { where: { id: [1] }, transaction: {} },
    );
  });

  it('should only mark as Published the events sent before Redis failed, and stop there', async () => {
    const events = [1, 2, 3, 4].map((id) => buildEvent({ id }));
    mockOutboxEventModel.findAll.mockResolvedValueOnce(events);
    mockRedisService.publishToStream
      .mockResolvedValueOnce('1-0')
      .mockResolvedValueOnce('2-0')
      .mockRejectedValueOnce(new Error('redis down'));

    await expect(service.relayPendingEvents()).resolves.not.toThrow();

    // 3 a échoué : 4 n'est pas tenté, seuls 1 et 2 passent Published.
    expect(mockRedisService.publishToStream).toHaveBeenCalledTimes(3);
    expect(mockOutboxEventModel.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ where: { id: [1, 2] } }),
    );
  });

  it('should not spin on the same full batch while Redis rejects every publish', async () => {
    const fullBatch = Array.from({ length: 100 }, (unusedValue, i) => buildEvent({ id: i + 1 }));
    mockOutboxEventModel.findAll.mockResolvedValue(fullBatch);
    mockRedisService.publishToStream.mockRejectedValue(new Error('OOM command not allowed'));

    await service.relayPendingEvents();

    expect(mockOutboxEventModel.findAll).toHaveBeenCalledTimes(1);
    expect(mockOutboxEventModel.update).not.toHaveBeenCalled();
  });

  it('should log instead of rejecting when the database fails during a pass', async () => {
    mockOutboxEventModel.findAll.mockRejectedValueOnce(new Error('connection terminated'));

    await expect(service.relayPendingEvents()).resolves.toBeUndefined();
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

  it('should schedule exactly one reconnect when the LISTEN connection fails', async () => {
    const handlers: Record<string, () => void> = {};
    const failingClient = {
      connect: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      query: jest.fn(),
      on: jest.fn((event: string, handler: () => void) => {
        handlers[event] = handler;
      }),
      end: jest.fn().mockResolvedValue(undefined),
    };
    (PgClient as unknown as jest.Mock).mockImplementationOnce(() => failingClient);
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockReturnValue({} as NodeJS.Timeout);

    await service['connectListenClient']();
    handlers.end(); // pg émet 'end' après un connect raté

    expect(failingClient.end).toHaveBeenCalled();
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    setTimeoutSpy.mockRestore();
  });
});
