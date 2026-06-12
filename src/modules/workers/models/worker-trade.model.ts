import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { WorkerProfile } from './worker-profile.model';
import { SkillCategory } from '@/modules/skill-category/models/skill-category.model';

@Table({ tableName: 'worker_trade', timestamps: false })
export class WorkerTrade extends Model {
  @ForeignKey(() => WorkerProfile)
  @Column({ field: 'worker_id', type: DataType.INTEGER, primaryKey: true })
  declare workerId: number;

  @BelongsTo(() => WorkerProfile)
  declare worker: WorkerProfile;

  @ForeignKey(() => SkillCategory)
  @Column({ field: 'skill_category_id', type: DataType.INTEGER, primaryKey: true })
  declare skillCategoryId: number;

  @BelongsTo(() => SkillCategory)
  declare skillCategory: SkillCategory;
}
