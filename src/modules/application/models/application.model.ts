import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Publication } from '@/modules/publication/models/publication.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';

@Table({ tableName: 'application', timestamps: false })
export class Application extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => Publication)
  @Column({ type: DataType.INTEGER, field: 'publication_id' })
  declare publicationId: number;

  @ForeignKey(() => WorkerProfile)
  @Column({ type: DataType.INTEGER, field: 'worker_id' })
  declare workerId: number;

  @Column({ type: DataType.STRING })
  declare status: string;

  @BelongsTo(() => Publication)
  declare publication: Publication;

  @BelongsTo(() => WorkerProfile)
  declare workerProfile: WorkerProfile;
}
