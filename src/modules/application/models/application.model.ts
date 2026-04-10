import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Publication } from '../../publication/models/publication.model';
import { WorkerProfile } from '../../worker-profile/models/worker-profile.model';

@Table({ tableName: 'application', timestamps: false })
export class Application extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => Publication)
  @Column({ type: DataType.INTEGER })
  declare publication_id: number;

  @ForeignKey(() => WorkerProfile)
  @Column({ type: DataType.INTEGER })
  declare worker_id: number;

  @Column({ type: DataType.STRING })
  declare status: string;

  @BelongsTo(() => Publication)
  declare publication: Publication;

  @BelongsTo(() => WorkerProfile)
  declare workerProfile: WorkerProfile;
}
