import { Table, Column, Model, DataType, HasOne, HasMany, Unique } from 'sequelize-typescript';
import { Optional } from 'sequelize';

export enum DocumentCategory {
  CONTRACT = 'CONTRACT',
  INVOICE = 'INVOICE',
  IDENTITY = 'IDENTITY',
  RIB = 'RIB',
  DIPLOMA = 'DIPLOMA',
  KBIS = 'KBIS',
  OTHER = 'OTHER',
}

import { Contract } from './contract.model';
import { Invoice } from './invoice.model';
import { DocumentAssignment } from './document-assignment.model';
import { DocumentContext } from './document-context.model';
import { Message } from '@/modules/chat/models/message.model';
import { SignatureEnvelope } from './signature-envelope.model';

export interface DocumentAttributes {
  id: number;
  name: string;
  originalFilename: string | null;
  filePath: string;
  category: DocumentCategory;
  sizeBytes: number | null;
  mimeType: string | null;
  versionId: string;
  checksumSha256: string;
  updatedAt?: Date;
  createdAt?: Date;
}

export type DocumentCreationAttributes = Optional<
  DocumentAttributes,
  'id' | 'createdAt' | 'updatedAt'
>;

@Table({
  tableName: 'document',
  underscored: true,
  timestamps: true,
})
export class Document
  extends Model<Document, DocumentCreationAttributes>
  implements DocumentAttributes
{
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
  declare originalFilename: string | null;

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
  declare sizeBytes: number | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare mimeType: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare versionId: string;

  @Column({
    type: DataType.STRING(64),
    allowNull: false,
  })
  declare checksumSha256: string;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;

  @Column({ field: 'updated_at', type: DataType.DATE })
  declare updatedAt: Date;

  @HasOne(() => Contract, 'documentId')
  declare contract: Contract;

  @HasOne(() => Invoice, 'documentId')
  declare invoice: Invoice;

  @HasMany(() => DocumentAssignment, 'documentId')
  declare assignments: DocumentAssignment[];

  @HasOne(() => DocumentContext, 'documentId')
  declare context: DocumentContext;

  @HasOne(() => SignatureEnvelope, 'documentId')
  declare signatureEnvelope: SignatureEnvelope;

  @HasMany(() => Message, 'documentId')
  declare messages: Message[];
}
