import { Test } from '@nestjs/testing';
import { ApplicationCreatedHandler } from './application-created.handler';
import { NotificationService } from '@/modules/notification/notification.service';
import { OutboxEventType } from '@/modules/application/models/outbox-event.model';

describe('ApplicationCreatedHandler', () => {
  let handler: ApplicationCreatedHandler;
  let mockNotificationService: { handleApplicationCreated: jest.Mock };

  beforeEach(async () => {
    mockNotificationService = { handleApplicationCreated: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplicationCreatedHandler,
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    handler = moduleRef.get<ApplicationCreatedHandler>(ApplicationCreatedHandler);
  });

  it('should expose APPLICATION_CREATED as its event type', () => {
    expect(handler.eventType).toBe(OutboxEventType.APPLICATION_CREATED);
  });

  it('should forward the parsed payload to NotificationService.handleApplicationCreated', async () => {
    await handler.handle({ publicationId: 10, applicationId: 42 }, 100);

    expect(mockNotificationService.handleApplicationCreated).toHaveBeenCalledWith(10, 42, 100);
  });
});
