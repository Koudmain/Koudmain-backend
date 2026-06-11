import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Document, DocumentCategory } from './document.model';
import { Mission } from '@/modules/missions/mission.model';

@Table({
  tableName: 'invoice',
  underscored: true,
  timestamps: false,
})
export class Invoice extends Model<Invoice> {
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
    defaultValue: DocumentCategory.INVOICE,
  })
  documentCategory: DocumentCategory;

  @ForeignKey(() => Mission)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  missionId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  invoiceNumber: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
  })
  amountHt: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
  })
  amountTtc: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
  })
  feeAmount: number;

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
