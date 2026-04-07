import { Column, Model, Table, DataType } from 'sequelize-typescript';

@Table({ tableName: 'worker_profile', timestamps: false })
export class WorkerProfile extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.INTEGER })
  declare user_id: number;
}