import { Test } from '@nestjs/testing';
import { ApplicationCreatedConsumerService } from './application-created-consumer.service';
import { NotificationService } from './notification.service';
import { RedisService, StreamEntry } from '@/shared/redis/redis.service';
import { OutboxEventType } from '@/modules/application/models/outbox-event.model';

describe('ApplicationCreatedConsumerService', () => {
  let service: ApplicationCreatedConsumerService;
  let mockRedisService: {
    ensureConsumerGroup: jest.Mock;
    readPendingStreamEntries: jest.Mock;
    readNewStreamEntries: jest.Mock;
    ackStreamEntry: jest.Mock;
  };
  let mockNotificationService: { handleApplicationCreated: jest.Mock };

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
    mockNotificationService = { handleApplicationCreated: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplicationCreatedConsumerService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = moduleRef.get<ApplicationCreatedConsumerService>(ApplicationCreatedConsumerService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it('should process an APPLICATION_CREATED entry, call the notification service, then ack', async () => {
    const entry = buildEntry();
    await (service as unknown as { handleEntry: (e: StreamEntry) => Promise<void> }).handleEntry(
      entry,
    );

    expect(mockNotificationService.handleApplicationCreated).toHaveBeenCalledWith(10, 42, 100);
    expect(mockRedisService.ackStreamEntry).toHaveBeenCalledWith(
      'outbox-events',
      'notification-service',
      '1-0',
    );
  });

  it('should ack without calling the notification service for an unrelated event type', async () => {
    const entry = buildEntry({ type: 'SOME_OTHER_EVENT' });
    await (service as unknown as { handleEntry: (e: StreamEntry) => Promise<void> }).handleEntry(
      entry,
    );

    expect(mockNotificationService.handleApplicationCreated).not.toHaveBeenCalled();
    expect(mockRedisService.ackStreamEntry).toHaveBeenCalled();
  });

  it('should not ack and keep the entry pending while under the max delivery attempts', async () => {
    mockNotificationService.handleApplicationCreated.mockRejectedValueOnce(new Error('boom'));
    const entry = buildEntry();

    await (service as unknown as { handleEntry: (e: StreamEntry) => Promise<void> }).handleEntry(
      entry,
    );

    expect(mockRedisService.ackStreamEntry).not.toHaveBeenCalled();
  });

  it('should give up and ack a poison message after reaching the max delivery attempts', async () => {
    mockNotificationService.handleApplicationCreated.mockRejectedValue(new Error('boom'));
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
