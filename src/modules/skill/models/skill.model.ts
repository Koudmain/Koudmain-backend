import { Column, Model, Table, DataType } from 'sequelize-typescript';

@Table({ tableName: 'skill', timestamps: false })
export class Skill extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true })
  declare id: number;

  @Column({ type: DataType.STRING, unique: true })
  declare name: string;
}

export class PostSkillDto {
  name: string;
}

export class PostSkillResponseDto {
  message: string;
  id: number;
}
