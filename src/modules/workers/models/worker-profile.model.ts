import {
  Column,
  Model,
  Table,
  DataType,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
  HasMany,
} from 'sequelize-typescript';
import { User } from '@/modules/users/models/user.model';
import { SkillCategory } from '@/modules/skill-category/models/skill-category.model';
import { Address } from '@/modules/address/address.model';
import { Transaction } from 'sequelize';
import { WorkerJob } from '@/modules/workers/models/worker-job.model';
import { WorkerExperience } from '@/modules/workers/models/worker-experience.model';
import { WorkerFormation } from '@/modules/workers/models/worker-formation.model';
import { WorkerVerification } from '@/modules/workers/models/worker-verification.model';

@Table({ tableName: 'worker_profile', timestamps: false })
export class WorkerProfile extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, field: 'user_id', allowNull: false })
  declare userId: number;

  @BelongsTo(() => User)
  declare user: User;

  @Column(DataType.TEXT)
  declare bio: string;

  @Column({ field: 'work_radius', type: DataType.INTEGER, defaultValue: 20 })
  declare workRadius: number;

  @Column({ field: 'skills_description', type: DataType.TEXT })
  declare skillsDescription: string;

  @Column({ field: 'review_count', type: DataType.INTEGER, defaultValue: 0 })
  declare reviewCount: number;

  @Column({ field: 'response_rate', type: DataType.DECIMAL(5, 2), allowNull: true })
  declare responseRate: number | null;

  @Column({ field: 'avg_response_time_min', type: DataType.INTEGER, allowNull: true })
  declare avgResponseTimeMin: number | null;

  @Column({ field: 'missions_completed', type: DataType.INTEGER, defaultValue: 0 })
  declare missionsCompleted: number;

  @BelongsToMany(() => SkillCategory, () => WorkerJob)
  declare skillCategories: SkillCategory[];

  @HasMany(() => WorkerExperience)
  declare experiences: WorkerExperience[];

  @HasMany(() => WorkerFormation)
  declare formations: WorkerFormation[];

  @HasMany(() => WorkerVerification)
  declare verifications: WorkerVerification[];

  @ForeignKey(() => Address)
  @Column({ field: 'address_id', type: DataType.INTEGER, allowNull: true })
  declare addressId: number | null;

  @BelongsTo(() => Address)
  declare address: Address | null;
}

export type CreateWorkerProfileOptions = { transaction?: Transaction };
