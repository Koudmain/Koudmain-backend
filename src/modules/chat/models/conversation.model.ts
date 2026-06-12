import {
  Column,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
  DataType,
  HasMany,
} from 'sequelize-typescript';
import { Publication } from '@/modules/publication/models/publication.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { Company } from '@/modules/companies/models/company.model';
import { ConversationSetting } from './conversation-setting.model';
import { Message } from './message.model';

@Table({ tableName: 'conversation', timestamps: false })
export class Conversation extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => Publication)
  @Column({ field: 'publication_id' })
  declare publicationId: number;

  @ForeignKey(() => WorkerProfile)
  @Column({ field: 'worker_id' })
  declare workerId: number;

  @ForeignKey(() => Company)
  @Column({ field: 'company_id' })
  declare companyId: number;

  @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
  declare updated_at: Date;

  @BelongsTo(() => Publication)
  declare publication: Publication;

  @BelongsTo(() => WorkerProfile)
  declare worker: WorkerProfile;

  @BelongsTo(() => Company)
  declare company: Company;

  @HasMany(() => ConversationSetting)
  declare settings: ConversationSetting[];

  @HasMany(() => Message, {
    foreignKey: 'conversationId',
    as: 'last_message',
    sourceKey: 'id',
  })
  declare last_message: Message;
}
