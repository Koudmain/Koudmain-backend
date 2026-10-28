import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';

@Table({ tableName: 'worker_experience', timestamps: false })
export class WorkerExperience extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => WorkerProfile)
  @Column({ field: 'worker_id', type: DataType.INTEGER, allowNull: false })
  declare workerId: number;

  @BelongsTo(() => WorkerProfile)
  declare worker: WorkerProfile;

  @Column({ type: DataType.STRING(255), allowNull: false })
  declare title: string;

  @Column({ field: 'duration_months', type: DataType.INTEGER, allowNull: true })
  declare durationMonths: number | null;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;
}
