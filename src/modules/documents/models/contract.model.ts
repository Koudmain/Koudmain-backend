import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Document, DocumentCategory } from './document.model';
import { Mission } from '@/modules/missions/mission.model';

export interface ContractAttributes {
  documentId: number;
  documentCategory: DocumentCategory;
  missionId: number;
  signedAt?: Date | null;
  workerSignatureId?: string | null;
  employerSignatureId?: string | null;
  status?: string | null;
}

@Table({
  tableName: 'contract',
  underscored: true,
  timestamps: true,
})
export class Contract extends Model<Contract, ContractAttributes> implements ContractAttributes {
  @ForeignKey(() => Document)
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    allowNull: false,
  })
  declare documentId: number;

  @Column({
    type: DataType.ENUM(...Object.values(DocumentCategory)),
    allowNull: false,
    defaultValue: DocumentCategory.CONTRACT,
  })
  declare documentCategory: DocumentCategory;

  @ForeignKey(() => Mission)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare missionId: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare signedAt: Date | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare workerSignatureId: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare employerSignatureId: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare status: string | null;

  @BelongsTo(() => Document, 'documentId')
  declare document: Document;

  @BelongsTo(() => Mission, 'missionId')
  declare mission: Mission;
}
