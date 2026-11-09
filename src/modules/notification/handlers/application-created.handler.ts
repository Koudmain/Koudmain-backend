import { Injectable } from '@nestjs/common';
import { OutboxEventType } from '@/modules/application/models/outbox-event.model';
import { OutboxEventHandler } from '@/modules/notification/outbox-event-handler.interface';
import { NotificationService } from '@/modules/notification/notification.service';

interface ApplicationCreatedPayload {
  publicationId: number;
  applicationId: number;
}

@Injectable()
export class ApplicationCreatedHandler implements OutboxEventHandler {
  readonly eventType = OutboxEventType.APPLICATION_CREATED;

  constructor(private readonly notificationService: NotificationService) {}

  async handle(payload: unknown, outboxEventId: number): Promise<void> {
    const { publicationId, applicationId } = payload as ApplicationCreatedPayload;
    await this.notificationService.handleApplicationCreated(
      publicationId,
      applicationId,
      outboxEventId,
    );
  }
}
