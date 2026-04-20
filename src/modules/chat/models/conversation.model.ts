import { Column, Model, Table, ForeignKey, BelongsTo, DataType } from 'sequelize-typescript';
import { Publication } from '@/modules/publication/models/publication.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { Company } from '@/modules/companies/models/company.model';

@Table({ tableName: 'conversation', timestamps: false })
export class Conversation extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => Publication)
  @Column
  declare publication_id: number;

  @ForeignKey(() => WorkerProfile)
  @Column
  declare worker_id: number;

  @ForeignKey(() => Company)
  @Column
  declare company_id: number;

  @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
  declare updated_at: Date;

  @BelongsTo(() => Publication)
  declare publication: Publication;

  @BelongsTo(() => WorkerProfile)
  declare worker: WorkerProfile;

  @BelongsTo(() => Company)
  declare company: Company;
}
