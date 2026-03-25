import { Column, Model, Table, DataType, ForeignKey } from 'sequelize-typescript';
import { User } from '../../users/models/user.model';

@Table({ tableName: 'refresh_session', timestamps: false })
export class RefreshSession extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare user_id: number;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare token_hash: string;

  @Column({ type: DataType.DATE, allowNull: false })
  declare expires_at: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  declare revoked_at: Date | null;

  @Column({
    field: 'created_at',
    type: DataType.DATE,
    allowNull: false,
    defaultValue: () => new Date(),
  })
  declare createdAt: Date;
}
