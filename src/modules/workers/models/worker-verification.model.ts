import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';

export enum WorkerVerificationType {
  IDENTITY = 'IDENTITY',
  SOCIAL_SECURITY = 'SOCIAL_SECURITY',
  ADDRESS_PROOF = 'ADDRESS_PROOF',
}

export enum WorkerVerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

@Table({ tableName: 'worker_verification', timestamps: false })
export class WorkerVerification extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => WorkerProfile)
  @Column({ field: 'worker_id', type: DataType.INTEGER, allowNull: false })
  declare workerId: number;

  @BelongsTo(() => WorkerProfile)
  declare worker: WorkerProfile;

  @Column({ type: DataType.STRING(50), allowNull: false })
  declare type: WorkerVerificationType;

  @Column({
    type: DataType.STRING(50),
    defaultValue: WorkerVerificationStatus.PENDING,
  })
  declare status: WorkerVerificationStatus;

  @Column({ field: 'verified_at', type: DataType.DATE, allowNull: true })
  declare verifiedAt: Date | null;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;
}
