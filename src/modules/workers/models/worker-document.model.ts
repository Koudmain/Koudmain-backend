import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { WorkerProfile } from './worker-profile.model';

export enum WorkerDocumentType {
  IDENTITY = 'IDENTITY',
  RIB = 'RIB',
  DIPLOMA = 'DIPLOMA',
}

@Table({ tableName: 'worker_document', timestamps: false })
export class WorkerDocument extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => WorkerProfile)
  @Column({ type: DataType.INTEGER, field: 'worker_id' })
  declare workerId: number;

  @Column({ type: DataType.INTEGER, field: 'document_id' })
  declare documentId: number;

  @Column({ type: DataType.STRING })
  declare type: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare verified: boolean;

  @BelongsTo(() => WorkerProfile)
  declare workerProfile: WorkerProfile;
}
