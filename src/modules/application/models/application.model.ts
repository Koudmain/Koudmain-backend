import {
  Column,
  Model,
  Table,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { Publication } from '@/modules/publication/models/publication.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { NotificationDelivery } from './notification-delivery.model';

export enum ApplicationStatus {
  PENDING = 'Pending',
  ACCEPTED = 'Accepted',
  REJECTED = 'Rejected',
}

@Table({ tableName: 'application', timestamps: false })
export class Application extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => Publication)
  @Column({ type: DataType.INTEGER, field: 'publication_id', allowNull: false })
  declare publicationId: number;

  @ForeignKey(() => WorkerProfile)
  @Column({ type: DataType.INTEGER, field: 'worker_id', allowNull: false })
  declare workerId: number;

  @Column({
    type: DataType.ENUM(
      ApplicationStatus.PENDING,
      ApplicationStatus.ACCEPTED,
      ApplicationStatus.REJECTED,
    ),
    allowNull: false,
    defaultValue: ApplicationStatus.PENDING,
  })
  declare status: ApplicationStatus;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;

  @BelongsTo(() => Publication)
  declare publication: Publication;

  @BelongsTo(() => WorkerProfile)
  declare workerProfile: WorkerProfile;

  @HasMany(() => NotificationDelivery, 'application_id')
  declare notificationDeliveries: NotificationDelivery[];
}
