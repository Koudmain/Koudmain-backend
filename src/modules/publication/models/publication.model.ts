import {
  Column,
  Model,
  Table,
  DataType,
  BelongsTo,
  HasMany,
  BelongsToMany,
} from 'sequelize-typescript';
import { Company } from '@/modules/companies/models/company.model';
import { User } from '@/modules/users/models/user.model';
import { Application } from '@/modules/application/models/application.model';
import { Skill } from '@/modules/skill/models/skill.model';
import { PublicationSkill } from './publication-skill.model';

@Table({ tableName: 'publication', timestamps: false })
export class Publication extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.INTEGER })
  declare company_id: number;

  @BelongsTo(() => Company, 'company_id')
  declare company: Company;

  @Column({ type: DataType.INTEGER })
  declare created_by_user_id: number;

  @BelongsTo(() => User, 'created_by_user_id')
  declare creator: User;

  @HasMany(() => Application, 'publication_id')
  declare applications: Application[];

  @BelongsToMany(() => Skill, () => PublicationSkill)
  declare skills?: Skill[];

  @Column({ type: DataType.INTEGER })
  declare address_id: number;

  @Column({ type: DataType.STRING })
  declare title: string;

  @Column({ type: DataType.TEXT })
  declare description: string;

  @Column({ type: DataType.DECIMAL(10, 2) })
  declare hourly_rate: number;

  @Column({ type: DataType.DATE })
  declare starting_date: Date;

  @Column({ type: DataType.DATE })
  declare ending_date: Date;

  @Column({ type: DataType.STRING })
  declare status: string;

  @Column({ type: DataType.BIGINT, defaultValue: 0 })
  declare views: number;

  @Column({ type: DataType.BIGINT, defaultValue: 0 })
  declare clicks: number;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;

  @Column({ field: 'updated_at', type: DataType.DATE })
  declare updatedAt: Date;
}

export class PostPublicationDto {
  declare company_id: number;
  declare created_by_user_id: number;
  declare address_id: number;
  declare title: string;
  declare description: string;
  declare hourly_rate: number;
  declare starting_date: Date;
  declare ending_date: Date;
  declare skills?: number[];
}

export class PostPublicationResponseDto {
  declare message: string;
  declare id: number;
  declare createdAt: Date;
}
