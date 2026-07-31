import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Optional } from 'sequelize';
import { Document } from './document.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { Company } from '@/modules/companies/models/company.model';
import { User } from '@/modules/users/models/user.model';

export interface DocumentAssignmentAttributes {
  id: number;
  documentId: number;
  workerId?: number | null;
  companyId?: number | null;
  userId?: number | null;
  type: string;
  verified: boolean;
}

export type DocumentAssignmentCreationAttributes = Optional<DocumentAssignmentAttributes, 'id'>;

@Table({
  tableName: 'document_assignment',
  underscored: true,
  timestamps: true,
})
export class DocumentAssignment
  extends Model<DocumentAssignment, DocumentAssignmentCreationAttributes>
  implements DocumentAssignmentAttributes
{
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
  declare workerId: number | null;

  @ForeignKey(() => Company)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare companyId: number | null;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare userId: number | null;

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

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;

  @Column({ field: 'updated_at', type: DataType.DATE })
  declare updatedAt: Date;

  @BelongsTo(() => Document, 'documentId')
  document: Document;

  @BelongsTo(() => WorkerProfile, 'workerId')
  worker: WorkerProfile;

  @BelongsTo(() => Company, 'companyId')
  company: Company;
}
