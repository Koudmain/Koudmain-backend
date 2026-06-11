import { Table, Column, Model, DataType, HasOne, HasMany, Unique } from 'sequelize-typescript';
import { Contract } from './contract.model';
import { Invoice } from './invoice.model';
import { DocumentAssignment } from './document-assignment.model';
import { DocumentContext } from './document-context.model';
import { Message } from '@/modules/chat/models/message.model';

export enum DocumentCategory {
  CONTRACT = 'CONTRACT',
  INVOICE = 'INVOICE',
  OTHER = 'OTHER',
}

@Table({
  tableName: 'document',
  underscored: true,
  timestamps: true,
  updatedAt: false,
})
export class Document extends Model<Document> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare originalFilename: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare filePath: string;

  @Unique('uq_document_id_category')
  @Column({
    type: DataType.ENUM(...Object.values(DocumentCategory)),
    allowNull: false,
  })
  declare category: DocumentCategory;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare sizeBytes: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare mimeType: string;

  @HasOne(() => Contract, 'documentId')
  contract: Contract;

  @HasOne(() => Invoice, 'documentId')
  invoice: Invoice;

  @HasMany(() => DocumentAssignment, 'documentId')
  assignments: DocumentAssignment[];

  @HasOne(() => DocumentContext, 'documentId')
  context: DocumentContext;

  @HasMany(() => Message, 'documentId')
  messages: Message[];
}
