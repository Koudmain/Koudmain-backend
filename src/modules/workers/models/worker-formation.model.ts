import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';

export enum WorkerFormationType {
  FORMATION = 'FORMATION',
  DIPLOMA = 'DIPLOMA',
  PERMIT = 'PERMIT',
}

@Table({ tableName: 'worker_formation', timestamps: false })
export class WorkerFormation extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => WorkerProfile)
  @Column({ field: 'worker_id', type: DataType.INTEGER, allowNull: false })
  declare workerId: number;

  @BelongsTo(() => WorkerProfile)
  declare worker: WorkerProfile;

  @Column({ type: DataType.STRING(255), allowNull: false })
  declare title: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare institution: string | null;

  @Column({ type: DataType.STRING(50), allowNull: true })
  declare type: WorkerFormationType | null;

  @Column({ field: 'obtained_date', type: DataType.DATEONLY, allowNull: true })
  declare obtainedDate: string | null;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;
}
