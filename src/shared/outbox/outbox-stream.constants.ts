/**
 * Clé du Redis Stream partagé entre le producteur (OutboxRelayService, qui publie via XADD)
 * et les consommateurs (ex: ApplicationCreatedConsumerService, qui lisent via XREADGROUP).
 * Doit rester une constante unique : la dupliquer créerait un risque de désynchronisation
 * silencieuse si l'une des deux copies est modifiée sans l'autre.
 */
export const OUTBOX_STREAM_KEY = 'outbox-events';
