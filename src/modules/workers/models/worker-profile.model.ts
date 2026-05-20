import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '@/modules/users/models/user.model';

@Table({ tableName: 'worker_profile', timestamps: false })
export class WorkerProfile extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER })
  declare user_id: number;

  @BelongsTo(() => User)
  declare user: User;

  @Column(DataType.TEXT)
  declare bio: string;

  @Column({ field: 'workplace_latitude', type: DataType.DECIMAL(9, 6) })
  declare workplace_latitude: number;

  @Column({ field: 'workplace_longitude', type: DataType.DECIMAL(9, 6) })
  declare workplace_longitude: number;

  @Column({ field: 'work_radius', type: DataType.INTEGER, defaultValue: 20 })
  declare work_radius: number;

  @Column({ field: 'skills_description', type: DataType.TEXT })
  declare skills_description: string;
}
