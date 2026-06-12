import {
  Column,
  Model,
  Table,
  DataType,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
} from 'sequelize-typescript';
import { User } from '@/modules/users/models/user.model';
import { SkillCategory } from '@/modules/skill-category/models/skill-category.model';
import { Address } from '@/modules/address/address.model';
import { Transaction } from 'sequelize';
import { WorkerTrade } from './worker-trade.model';

@Table({ tableName: 'worker_profile', timestamps: false })
export class WorkerProfile extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, field: 'user_id' })
  declare userId: number;

  @BelongsTo(() => User)
  declare user: User;

  @Column(DataType.TEXT)
  declare bio: string;

  @Column({ field: 'work_radius', type: DataType.INTEGER, defaultValue: 20 })
  declare workRadius: number;

  @Column({ field: 'skills_description', type: DataType.TEXT })
  declare skillsDescription: string;

  @BelongsToMany(() => SkillCategory, () => WorkerTrade)
  declare skillCategories: SkillCategory[];

  @ForeignKey(() => Address)
  @Column({ field: 'address_id', type: DataType.INTEGER, allowNull: true })
  declare addressId: number | null;

  @BelongsTo(() => Address)
  declare address: Address | null;
}

export type CreateWorkerProfileOptions = { transaction?: Transaction };
