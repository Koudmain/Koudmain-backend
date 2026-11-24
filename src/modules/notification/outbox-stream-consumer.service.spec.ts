import { hostname } from 'os';
import { Test } from '@nestjs/testing';
import { CONSUMER_NAME, OutboxStreamConsumerService } from './outbox-stream-consumer.service';
import { RedisService, StreamEntry } from '@/shared/redis/redis.service';
import { OutboxEventType } from '@/modules/application/models/outbox-event.model';
import { OUTBOX_EVENT_HANDLERS } from '@/modules/notification/notification.constants';
import { OutboxEventHandler } from '@/modules/notification/outbox-event-handler.interface';

describe('OutboxStreamConsumerService', () => {
  let service: OutboxStreamConsumerService;
  let mockRedisService: {
    ensureConsumerGroup: jest.Mock;
    getStalePendingEntries: jest.Mock;
    claimStreamEntries: jest.Mock;
    readNewStreamEntries: jest.Mock;
    ackStreamEntry: jest.Mock;
  };
  let mockApplicationCreatedHandler: OutboxEventHandler & { handle: jest.Mock };

  const buildEntry = (overrides: Partial<StreamEntry['fields']> = {}): StreamEntry => ({
    id: '1-0',
    fields: {
      id: '100',
      type: OutboxEventType.APPLICATION_CREATED,
      payload: JSON.stringify({ publicationId: 10, applicationId: 42 }),
      ...overrides,
    },
  });

  beforeEach(async () => {
    mockRedisService = {
      ensureConsumerGroup: jest.fn().mockResolvedValue(undefined),
      getStalePendingEntries: jest.fn().mockResolvedValue([]),
      claimStreamEntries: jest.fn().mockResolvedValue([]),
      readNewStreamEntries: jest.fn().mockResolvedValue([]),
      ackStreamEntry: jest.fn().mockResolvedValue(undefined),
    };
    mockApplicationCreatedHandler = {
      eventType: OutboxEventType.APPLICATION_CREATED,
      handle: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OutboxStreamConsumerService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: OUTBOX_EVENT_HANDLERS, useValue: [mockApplicationCreatedHandler] },
      ],
    }).compile();

    service = moduleRef.get<OutboxStreamConsumerService>(OutboxStreamConsumerService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw at construction time if two handlers register the same event type', () => {
    const duplicateHandler: OutboxEventHandler = {
      eventType: OutboxEventType.APPLICATION_CREATED,
      handle: jest.fn(),
    };

    expect(
      () =>
        new OutboxStreamConsumerService(mockRedisService as unknown as RedisService, [
          mockApplicationCreatedHandler,
          duplicateHandler,
        ]),
    ).toThrow(/Plusieurs OutboxEventHandler/);
  });

  it('should ensure the consumer group exists and start the loop on module init', async () => {
    const runLoopSpy = jest
      .spyOn(service as unknown as { runLoop: () => Promise<void> }, 'runLoop')
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(mockRedisService.ensureConsumerGroup).toHaveBeenCalledWith(
      'outbox-events',
      'notification-service',
    );
    expect(runLoopSpy).toHaveBeenCalled();
  });

  it('should route an APPLICATION_CREATED entry to its handler, then ack', async () => {
    const entry = buildEntry();
    await (service as unknown as { handleEntry: (e: StreamEntry) => Promise<void> }).handleEntry(
      entry,
    );

    expect(mockApplicationCreatedHandler.handle).toHaveBeenCalledWith(
      { publicationId: 10, applicationId: 42 },
      100,
    );
    expect(mockRedisService.ackStreamEntry).toHaveBeenCalledWith(
      'outbox-events',
      'notification-service',
      '1-0',
    );
  });

  it('should ack without calling any handler for an unrelated event type', async () => {
    const entry = buildEntry({ type: 'SOME_OTHER_EVENT' });
    await (service as unknown as { handleEntry: (e: StreamEntry) => Promise<void> }).handleEntry(
      entry,
    );

    expect(mockApplicationCreatedHandler.handle).not.toHaveBeenCalled();
    expect(mockRedisService.ackStreamEntry).toHaveBeenCalled();
  });

  it('should not ack a failed entry so that it stays pending for a later retry', async () => {
    mockApplicationCreatedHandler.handle.mockRejectedValueOnce(new Error('boom'));
    const entry = buildEntry();

    await (service as unknown as { handleEntry: (e: StreamEntry) => Promise<void> }).handleEntry(
      entry,
    );

    expect(mockRedisService.ackStreamEntry).not.toHaveBeenCalled();
  });

  describe('loop', () => {
    // Fait un seul tour de boucle : le premier XREADGROUP arrête la boucle.
    const runOneIteration = async () => {
      mockRedisService.readNewStreamEntries.mockImplementationOnce(async () => {
        (service as unknown as { isDestroyed: boolean }).isDestroyed = true;
        return [];
      });
      await (service as unknown as { runLoop: () => Promise<void> }).runLoop();
    };

    it('should read new entries under a consumer name unique to this instance', async () => {
      await runOneIteration();

      expect(CONSUMER_NAME).toBe(`${hostname()}-${process.pid}`);
      expect(mockRedisService.readNewStreamEntries).toHaveBeenCalledWith(
        'outbox-events',
        'notification-service',
        CONSUMER_NAME,
        5000,
      );
    });

    it('should claim and process entries left pending for 30s, before reading new ones', async () => {
      const entry = buildEntry();
      mockRedisService.getStalePendingEntries.mockResolvedValueOnce([
        { id: '1-0', deliveryCount: 2 },
      ]);
      mockRedisService.claimStreamEntries.mockResolvedValueOnce([entry]);

      await runOneIteration();

      expect(mockRedisService.getStalePendingEntries).toHaveBeenCalledWith(
        'outbox-events',
        'notification-service',
        30_000,
        10,
      );
      expect(mockRedisService.claimStreamEntries).toHaveBeenCalledWith(
        'outbox-events',
        'notification-service',
        CONSUMER_NAME,
        30_000,
        ['1-0'],
      );
      expect(mockApplicationCreatedHandler.handle).toHaveBeenCalledTimes(1);
      expect(mockRedisService.ackStreamEntry).toHaveBeenCalledWith(
        'outbox-events',
        'notification-service',
        '1-0',
      );
    });

    it('should give up and ack an entry already delivered 5 times, without retrying it', async () => {
      mockRedisService.getStalePendingEntries.mockResolvedValueOnce([
        { id: '1-0', deliveryCount: 5 },
      ]);

      await runOneIteration();

      expect(mockRedisService.claimStreamEntries).not.toHaveBeenCalled();
      expect(mockApplicationCreatedHandler.handle).not.toHaveBeenCalled();
      expect(mockRedisService.ackStreamEntry).toHaveBeenCalledWith(
        'outbox-events',
        'notification-service',
        '1-0',
      );
    });
  });
});
