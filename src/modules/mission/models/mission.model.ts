import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Publication } from '@/modules/publication/models/publication.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { Company } from '@/modules/companies/models/company.model';

export enum MissionStatus {
  PLANNED = 'Planned',
  IN_PROGRESS = 'In_Progress',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

@Table({ tableName: 'mission', timestamps: false })
export class Mission extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => Publication)
  @Column({ field: 'publication_id', type: DataType.INTEGER })
  declare publicationId: number;

  @BelongsTo(() => Publication)
  declare publication: Publication;

  @ForeignKey(() => WorkerProfile)
  @Column({ field: 'worker_id', type: DataType.INTEGER })
  declare workerId: number;

  @BelongsTo(() => WorkerProfile)
  declare worker: WorkerProfile;

  @ForeignKey(() => Company)
  @Column({ field: 'company_id', type: DataType.INTEGER })
  declare companyId: number;

  @BelongsTo(() => Company)
  declare company: Company;

  @Column({ type: DataType.STRING(50) })
  declare status: MissionStatus;

  @Column({ field: 'paid_at', type: DataType.DATE, allowNull: true })
  declare paidAt: Date | null;

  @Column({ field: 'payment_due_date', type: DataType.DATE, allowNull: true })
  declare paymentDueDate: Date | null;
}
