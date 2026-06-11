import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Document } from './document.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { Conversation } from '@/modules/chat/models/conversation.model';
import { Mission } from '@/modules/missions/mission.model';

@Table({
  tableName: 'document_context',
  underscored: true,
  timestamps: false,
})
export class DocumentContext extends Model<DocumentContext> {
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
  publicationId: number;

  @ForeignKey(() => Conversation)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  conversationId: number;

  @ForeignKey(() => Mission)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  missionId: number;

  @BelongsTo(() => Document, 'documentId')
  document: Document;

  @BelongsTo(() => Publication, 'publicationId')
  publication: Publication;

  @BelongsTo(() => Conversation, 'conversationId')
  conversation: Conversation;

  @BelongsTo(() => Mission, 'missionId')
  mission: Mission;
}
