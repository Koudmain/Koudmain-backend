import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { SkillCategory } from './skill-category.model';

@Table({ tableName: 'skill', timestamps: false })
export class Skill extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING, unique: true })
  declare name: string;

  @ForeignKey(() => SkillCategory)
  @Column({ type: DataType.INTEGER })
  declare category_id: number;

  @BelongsTo(() => SkillCategory)
  declare category: SkillCategory;
}

export class PostSkillDto {
  name: string;
  category_id?: number;
}

export class PostSkillResponseDto {
  message: string;
  id: number;
}
