import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Document, DocumentCategory } from './document.model';
import { Mission } from '@/modules/missions/mission.model';

export interface InvoiceAttributes {
  documentId: number;
  documentCategory: DocumentCategory;
  missionId: number;
  invoiceNumber: string;
  amountHt?: number | null;
  amountTtc?: number | null;
  feeAmount?: number | null;
  status?: string | null;
}

@Table({
  tableName: 'invoice',
  underscored: true,
  timestamps: true,
})
export class Invoice extends Model<Invoice, InvoiceAttributes> implements InvoiceAttributes {
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
    defaultValue: DocumentCategory.INVOICE,
  })
  declare documentCategory: DocumentCategory;

  @ForeignKey(() => Mission)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare missionId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  declare invoiceNumber: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
  })
  declare amountHt: number | null;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
  })
  declare amountTtc: number | null;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
  })
  declare feeAmount: number | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare status: string | null;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;

  @Column({ field: 'updated_at', type: DataType.DATE })
  declare updatedAt: Date;

  @BelongsTo(() => Document, 'documentId')
  declare document: Document;

  @BelongsTo(() => Mission, 'missionId')
  declare mission: Mission;
}
