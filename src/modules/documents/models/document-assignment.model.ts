import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Document } from './document.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { Company } from '@/modules/companies/models/company.model';

@Table({
  tableName: 'document_assignment',
  underscored: true,
  timestamps: true,
  updatedAt: false,
})
export class DocumentAssignment extends Model<DocumentAssignment> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  })
  declare id: number;

  @ForeignKey(() => Document)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare documentId: number;

  @ForeignKey(() => WorkerProfile)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare workerId: number;

  @ForeignKey(() => Company)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare companyId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare type: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  declare verified: boolean;

  @BelongsTo(() => Document, 'documentId')
  document: Document;

  @BelongsTo(() => WorkerProfile, 'workerId')
  worker: WorkerProfile;

  @BelongsTo(() => Company, 'companyId')
  company: Company;
}
