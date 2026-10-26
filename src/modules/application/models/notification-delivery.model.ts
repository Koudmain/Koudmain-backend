import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Application } from './application.model';
import { OutboxEvent } from './outbox-event.model';

export enum NotificationChannel {
  PUSH = 'Push',
  WEBSOCKET = 'Websocket',
}

export enum NotificationDeliveryStatus {
  SENT = 'Sent',
  FAILED = 'Failed',
}

/**
 * Trace un envoi de notification (push ou WebSocket) déclenché par un événement
 * de l'outbox, pour une candidature donnée. Sert de journal de livraison : debug
 * et, plus tard, traçabilité des informations transmises à l'employeur.
 */
@Table({ tableName: 'notification_delivery', timestamps: false })
export class NotificationDelivery extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => OutboxEvent)
  @Column({ type: DataType.INTEGER, field: 'outbox_event_id', allowNull: false })
  declare outboxEventId: number;

  @ForeignKey(() => Application)
  @Column({ type: DataType.INTEGER, field: 'application_id', allowNull: false })
  declare applicationId: number;

  @Column({
    type: DataType.ENUM(NotificationChannel.PUSH, NotificationChannel.WEBSOCKET),
    allowNull: false,
  })
  declare channel: NotificationChannel;

  @Column({
    type: DataType.ENUM(NotificationDeliveryStatus.SENT, NotificationDeliveryStatus.FAILED),
    allowNull: false,
  })
  declare status: NotificationDeliveryStatus;

  @Column({ field: 'error_message', type: DataType.TEXT, allowNull: true })
  declare errorMessage: string | null;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;

  @BelongsTo(() => OutboxEvent)
  declare outboxEvent: OutboxEvent;

  @BelongsTo(() => Application)
  declare application: Application;
}
