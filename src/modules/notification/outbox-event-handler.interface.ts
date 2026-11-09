import { OutboxEventType } from '@/modules/application/models/outbox-event.model';

export interface OutboxEventHandler {
  readonly eventType: OutboxEventType;
  handle(payload: unknown, outboxEventId: number): Promise<void>;
}
