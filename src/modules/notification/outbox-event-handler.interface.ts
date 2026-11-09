import { OutboxEventType } from '@/modules/application/models/outbox-event.model';

/**
 * Contrat qu'un handler métier doit implémenter pour traiter un type d'outbox event.
 * Le consumer générique (OutboxStreamConsumerService) route chaque entrée du stream
 * vers le handler dont `eventType` correspond, sans connaître la logique métier.
 */
export interface OutboxEventHandler {
  readonly eventType: OutboxEventType;
  handle(payload: unknown, outboxEventId: number): Promise<void>;
}
