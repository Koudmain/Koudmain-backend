import { User } from '@/modules/users/models/user.model';
import { BelongsTo, Column, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'admin_profile', timestamps: false })
export class AdminProfile extends Model {
  @Column({ type: 'INTEGER', primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({
    type: 'INTEGER',
    unique: true,
    references: { model: 'user', key: 'id' },
    onDelete: 'CASCADE',
  })
  declare user_id: number;

  @Column({ type: 'ENUM', values: ['SUPER_ADMIN', 'ADMIN'], defaultValue: 'ADMIN' })
  declare role: 'SUPER_ADMIN' | 'ADMIN';

  @Column({ field: 'created_at', type: 'TIMESTAMP', defaultValue: () => new Date() })
  declare created_at: Date;

  @BelongsTo(() => User)
  declare user: User;
}
