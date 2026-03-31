import { Column, Model, Table, DataType } from 'sequelize-typescript';

@Table({ tableName: 'company', timestamps: false })
export class Company extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column(DataType.STRING)
  declare name: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare is_premium: boolean;
}
