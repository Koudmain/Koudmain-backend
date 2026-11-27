import { Column, Model, Table, ForeignKey, BelongsTo, DataType } from 'sequelize-typescript';
import { Conversation } from './conversation.model';
import { User } from '@/modules/users/models/user.model';

@Table({ tableName: 'message', timestamps: false })
export class Message extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => Conversation)
  @Column({ field: 'conversation_id', type: DataType.INTEGER })
  declare conversationId: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER })
  declare sender_id: number;

  @Column(DataType.TEXT)
  declare content_text: string;

  @Column(DataType.STRING)
  declare file_url: string;

  @Column({ type: DataType.ENUM('TEXT', 'IMAGE', 'AUDIO', 'FILE'), defaultValue: 'TEXT' })
  declare message_type: string;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;

  @BelongsTo(() => Conversation)
  declare conversation: Conversation;

  @BelongsTo(() => User)
  declare sender: User;
}

export interface MessageAttributes {
  id: number;
  conversationId: number;
  sender_id: number;
  content_text: string;
  file_url: string;
  message_type: string;
  createdAt: Date;
}
