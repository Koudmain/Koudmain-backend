import { Table, Column, Model, ForeignKey, DataType } from 'sequelize-typescript';
import { Publication } from './publication.model';
import { Skill } from '@/modules/skill/models/skill.model';

@Table({ tableName: 'publication_skill', timestamps: false })
export class PublicationSkill extends Model {
  @ForeignKey(() => Publication)
  @Column({ type: DataType.INTEGER, primaryKey: true })
  declare publication_id: number;

  @ForeignKey(() => Skill)
  @Column({ type: DataType.INTEGER, primaryKey: true })
  declare skill_id: number;
}
