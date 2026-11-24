import { Test } from '@nestjs/testing';
import { OutboxStreamConsumerService } from './outbox-stream-consumer.service';
import { RedisService, StreamEntry } from '@/shared/redis/redis.service';
import { OutboxEventType } from '@/modules/application/models/outbox-event.model';
import { OUTBOX_EVENT_HANDLERS } from '@/modules/notification/notification.constants';
import { OutboxEventHandler } from '@/modules/notification/outbox-event-handler.interface';

describe('OutboxStreamConsumerService', () => {
  let service: OutboxStreamConsumerService;
  let mockRedisService: {
    ensureConsumerGroup: jest.Mock;
    readPendingStreamEntries: jest.Mock;
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
      readPendingStreamEntries: jest.fn().mockResolvedValue([]),
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

  it('should not ack and keep the entry pending while under the max delivery attempts', async () => {
    mockApplicationCreatedHandler.handle.mockRejectedValueOnce(new Error('boom'));
    const entry = buildEntry();

    await (service as unknown as { handleEntry: (e: StreamEntry) => Promise<void> }).handleEntry(
      entry,
    );

    expect(mockRedisService.ackStreamEntry).not.toHaveBeenCalled();
  });

  it('should give up and ack a poison message after reaching the max delivery attempts', async () => {
    mockApplicationCreatedHandler.handle.mockRejectedValue(new Error('boom'));
    const entry = buildEntry();
    const handleEntry = (
      service as unknown as { handleEntry: (e: StreamEntry) => Promise<void> }
    ).handleEntry.bind(service);

    for (let i = 0; i < 5; i += 1) {
      await handleEntry(entry);
    }

    expect(mockRedisService.ackStreamEntry).toHaveBeenCalledWith(
      'outbox-events',
      'notification-service',
      '1-0',
    );
  });
});
