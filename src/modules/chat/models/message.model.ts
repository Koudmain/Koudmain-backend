import { Column, Model, Table, ForeignKey, BelongsTo, DataType } from 'sequelize-typescript';
import { Conversation } from './conversation.model';
import { User } from '@/modules/users/models/user.model';
import { Document } from '@/modules/documents/models/document.model';

@Table({ tableName: 'message', timestamps: true, createdAt: 'created_at', updatedAt: false })
export class Message extends Model {
  @ForeignKey(() => Conversation)
  @Column({ field: 'conversation_id' })
  declare conversationId: number;

  @ForeignKey(() => User)
  @Column
  declare sender_id: number;

  @Column(DataType.TEXT)
  declare content_text: string;

  @Column
  declare file_url: string;

  @Column({ type: DataType.ENUM('TEXT', 'IMAGE', 'AUDIO', 'FILE'), defaultValue: 'TEXT' })
  declare message_type: string;

  @ForeignKey(() => Document)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  documentId: number;

  @BelongsTo(() => Conversation)
  declare conversation: Conversation;

  @BelongsTo(() => User)
  declare sender: User;

  @BelongsTo(() => Document, 'documentId')
  document: Document;
}

export interface MessageAttributes {
  id: number;
  conversationId: number;
  sender_id: number;
  content_text: string;
  file_url: string;
  message_type: string;
}
