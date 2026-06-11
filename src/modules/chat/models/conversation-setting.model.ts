import { User } from '@/modules/users/models/user.model';
import { Column, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Conversation } from './conversation.model';

@Table({ tableName: 'conversation_settings' })
export class ConversationSetting extends Model {
  @ForeignKey(() => User)
  @Column({ field: 'user_id', primaryKey: true })
  declare userId: number;

  @ForeignKey(() => Conversation)
  @Column({ field: 'conversation_id', primaryKey: true })
  declare conversationId: number;

  @Column({ defaultValue: false })
  declare is_pinned: boolean;

  @Column({ defaultValue: false })
  declare is_deleted: boolean;

  @BelongsTo(() => Conversation)
  declare conversation: Conversation;
}
