import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Unique,
} from 'sequelize-typescript';
import { Document } from './document.model';

export enum SignatureProvider {
  DOCUMENSO = 'DOCUMENSO',
  DOCUSIGN = 'DOCUSIGN',
  YOUSIGN = 'YOUSIGN',
}

export enum SignatureStatus {
  PENDING = 'PENDING',
  PARTIALLY_SIGNED = 'PARTIALLY_SIGNED',
  COMPLETED = 'COMPLETED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

export interface SignatureEnvelopeAttributes {
  id?: number;
  documentId: number;
  provider: SignatureProvider;
  externalDocumentId: string;
  status: SignatureStatus;
}

@Table({
  tableName: 'signature_envelope',
  underscored: true,
  timestamps: true,
})
export class SignatureEnvelope
  extends Model<SignatureEnvelope, SignatureEnvelopeAttributes>
  implements SignatureEnvelopeAttributes
{
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  })
  declare id: number;

  @ForeignKey(() => Document)
  @Unique
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare documentId: number;

  @Column({
    type: DataType.ENUM(...Object.values(SignatureProvider)),
    allowNull: false,
    defaultValue: SignatureProvider.DOCUMENSO,
  })
  declare provider: SignatureProvider;

  @Unique
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare externalDocumentId: string;

  @Column({
    type: DataType.ENUM(...Object.values(SignatureStatus)),
    allowNull: false,
    defaultValue: SignatureStatus.PENDING,
  })
  declare status: SignatureStatus;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;

  @Column({ field: 'updated_at', type: DataType.DATE })
  declare updatedAt: Date;

  @BelongsTo(() => Document, 'documentId')
  document: Document;
}
