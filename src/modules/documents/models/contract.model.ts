import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Document, DocumentCategory } from './document.model';
import { Mission } from '@/modules/missions/mission.model';

@Table({
  tableName: 'contract',
  underscored: true,
  timestamps: false,
})
export class Contract extends Model<Contract> {
  @ForeignKey(() => Document)
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    allowNull: false,
  })
  documentId: number;

  @Column({
    type: DataType.ENUM(...Object.values(DocumentCategory)),
    allowNull: false,
    defaultValue: DocumentCategory.CONTRACT,
  })
  documentCategory: DocumentCategory;

  @ForeignKey(() => Mission)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  missionId: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  signedAt: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  workerSignatureId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  employerSignatureId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  status: string;

  @BelongsTo(() => Document, 'documentId')
  document: Document;

  @BelongsTo(() => Mission, 'missionId')
  mission: Mission;
}
