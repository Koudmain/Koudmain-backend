import {
  Column,
  Model,
  Table,
  DataType,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
} from 'sequelize-typescript';
import { SkillCategory } from '@/modules/skill-category/models/skill-category.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { PublicationSkill } from '@/modules/publication/models/publication-skill.model';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Table({ tableName: 'skill', timestamps: false })
export class Skill extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING, unique: true })
  declare name: string;

  @ForeignKey(() => SkillCategory)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare category_id?: number | null;

  @BelongsTo(() => SkillCategory)
  declare category?: SkillCategory | null;

  @BelongsToMany(() => Publication, () => PublicationSkill)
  declare publications?: Publication[];
}

export class PostSkillDto {
  @ApiProperty({ example: 'Service en salle', description: 'Nom de la compétence' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 1, description: 'ID de la catégorie associée' })
  @IsOptional()
  category_id?: number | null;
}

export class PostSkillResponseDto {
  message: string;
  id: number;
}
