import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Publication } from '@/modules/publication/models/publication.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { Document } from '@/modules/document/models/document.model';

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
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: ApplicationStatus.PENDING,
  })
  declare status: ApplicationStatus;

  @Column({
    field: 'created_at',
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  declare createdAt: Date;

  @Column({ field: 'cv_document_id', type: DataType.INTEGER, allowNull: true })
  declare cvDocumentId: number | null;

  @Column({ field: 'cover_letter_document_id', type: DataType.INTEGER, allowNull: true })
  declare coverLetterDocumentId: number | null;

  @Column({ field: 'responded_at', type: DataType.DATE, allowNull: true })
  declare respondedAt: Date | null;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;

  @BelongsTo(() => Publication)
  declare publication: Publication;

  @BelongsTo(() => WorkerProfile)
  declare workerProfile: WorkerProfile;

  @BelongsTo(() => Document, 'cvDocumentId')
  declare cvDocument: Document | null;

  @BelongsTo(() => Document, 'coverLetterDocumentId')
  declare coverLetterDocument: Document | null;
}
