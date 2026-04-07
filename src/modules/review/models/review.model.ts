import { Column, Model, Table, DataType } from 'sequelize-typescript';

@Table({ tableName: 'review', timestamps: false })
export class Review extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.INTEGER })
  declare rated_id: number;

  @Column({ type: DataType.INTEGER })
  declare rating: number;
}