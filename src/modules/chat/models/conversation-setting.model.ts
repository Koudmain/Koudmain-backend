import { User } from '@/modules/users/models/user.model';
import { Column, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Conversation } from './conversation.model';

@Table({ tableName: 'conversation_settings' })
export class ConversationSetting extends Model {
  @ForeignKey(() => User)
  @Column({ primaryKey: true })
  declare user_id: number;

  @ForeignKey(() => Conversation)
  @Column({ primaryKey: true })
  declare conversation_id: number;

  @Column({ defaultValue: false })
  declare is_pinned: boolean;

  @Column({ defaultValue: false })
  declare is_deleted: boolean;

  @BelongsTo(() => Conversation)
  declare conversation: Conversation;
}
