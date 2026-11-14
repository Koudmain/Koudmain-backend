import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Document } from './document.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { Conversation } from '@/modules/chat/models/conversation.model';
import { Mission } from '@/modules/missions/mission.model';

export interface DocumentContextAttributes {
  documentId: number;
  publicationId?: number | null;
  conversationId?: number | null;
  missionId?: number | null;
}

@Table({
  tableName: 'document_context',
  underscored: true,
  timestamps: false,
})
export class DocumentContext
  extends Model<DocumentContext, DocumentContextAttributes>
  implements DocumentContextAttributes
{
  @ForeignKey(() => Document)
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    allowNull: false,
  })
  declare documentId: number;

  @ForeignKey(() => Publication)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare publicationId: number | null;

  @ForeignKey(() => Conversation)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare conversationId: number | null;

  @ForeignKey(() => Mission)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare missionId: number | null;

  @BelongsTo(() => Document, 'documentId')
  declare document: Document;

  @BelongsTo(() => Publication, 'publicationId')
  declare publication: Publication;

  @BelongsTo(() => Conversation, 'conversationId')
  declare conversation: Conversation;

  @BelongsTo(() => Mission, 'missionId')
  declare mission: Mission;
}
