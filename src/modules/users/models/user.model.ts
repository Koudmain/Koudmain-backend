import { Column, Model, Table, DataType } from 'sequelize-typescript';

@Table({ tableName: 'user', timestamps: false })
export class User extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true })
  declare id: number;

  @Column({ type: DataType.STRING, unique: true })
  declare first_name: string;

  @Column({ type: DataType.STRING, unique: true })
  declare last_name: string;

  @Column({ type: DataType.STRING, unique: true })
  declare email: string;

  @Column(DataType.STRING)
  declare password: string;

  @Column({ field: 'user_type', type: DataType.STRING })
  declare userType: string;

  @Column({ field: 'updated_at', type: DataType.DATE })
  declare updatedAt: Date;
}