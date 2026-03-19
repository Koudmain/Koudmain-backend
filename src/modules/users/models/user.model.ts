import { BOOLEAN } from 'sequelize';
import { Column, Model, Table, DataType } from 'sequelize-typescript';

@Table({ tableName: 'user', timestamps: false })
export class User extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true })
  declare id: number;

  @Column({ type: DataType.STRING, unique: true })
  declare first_name: string;

  @Column({ type: DataType.STRING, unique: true })
  declare last_name: string;

  @Column
  declare profile_picture_url: string;

  @Column({ type: DataType.STRING, unique: true })
  declare email: string;

  @Column(DataType.STRING)
  declare password: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare is_worker_active: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare is_employer_active: boolean;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;
}
