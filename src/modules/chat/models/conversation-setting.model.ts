import { User } from '@/modules/users/models/user.model';
import {
  Column,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
  PrimaryKey,
  AutoIncrement,
  Unique,
} from 'sequelize-typescript';
import { Conversation } from './conversation.model';

@Table({ tableName: 'conversation_settings' })
export class ConversationSetting extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  declare id: number;

  @ForeignKey(() => User)
  @Unique('user_conversation_unique_idx')
  @Column
  declare user_id: number;

  @ForeignKey(() => Conversation)
  @Unique('user_conversation_unique_idx')
  @Column
  declare conversation_id: number;

  @Column({ defaultValue: false })
  declare is_pinned: boolean;

  @Column({ defaultValue: false })
  declare is_deleted: boolean;

  @BelongsTo(() => Conversation)
  declare conversation: Conversation;
}
