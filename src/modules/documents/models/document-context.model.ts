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
  documentId: number;

  @ForeignKey(() => Publication)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  publicationId: number | null;

  @ForeignKey(() => Conversation)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  conversationId: number | null;

  @ForeignKey(() => Mission)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  missionId: number | null;

  @BelongsTo(() => Document, 'documentId')
  document: Document;

  @BelongsTo(() => Publication, 'publicationId')
  publication: Publication;

  @BelongsTo(() => Conversation, 'conversationId')
  conversation: Conversation;

  @BelongsTo(() => Mission, 'missionId')
  mission: Mission;
}
