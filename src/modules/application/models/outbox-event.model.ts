import { Column, Model, Table, DataType, HasMany } from 'sequelize-typescript';
import { NotificationDelivery } from './notification-delivery.model';

export enum OutboxEventStatus {
  PENDING = 'Pending',
  PUBLISHED = 'Published',
}

/**
 * Type d'événement technique porté par une ligne de l'outbox. Volontairement une
 * liste de constantes plutôt qu'un enum Postgres : la colonne `type` reste un varchar
 * libre en base pour ne pas faire dépendre les futurs types d'événements (mission,
 * contrat, DPAE...) de cette migration.
 */
export enum OutboxEventType {
  APPLICATION_CREATED = 'APPLICATION_CREATED',
}

@Table({ tableName: 'outbox_event', timestamps: false })
export class OutboxEvent extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare type: OutboxEventType;

  @Column({ type: DataType.JSONB, allowNull: false })
  declare payload: Record<string, unknown>;

  @Column({
    type: DataType.ENUM(OutboxEventStatus.PENDING, OutboxEventStatus.PUBLISHED),
    allowNull: false,
    defaultValue: OutboxEventStatus.PENDING,
  })
  declare status: OutboxEventStatus;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;

  @Column({ field: 'published_at', type: DataType.DATE, allowNull: true })
  declare publishedAt: Date | null;

  @HasMany(() => NotificationDelivery, 'outbox_event_id')
  declare notificationDeliveries: NotificationDelivery[];
}
