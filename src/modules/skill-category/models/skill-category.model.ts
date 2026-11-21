import { Column, Model, Table, DataType } from 'sequelize-typescript';

@Table({ tableName: 'skill_category', timestamps: false })
export class SkillCategory extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ field: 'created_by', type: DataType.INTEGER })
  declare createdBy: number | null;

  @Column({ type: DataType.STRING, unique: true })
  declare name: string;
}
