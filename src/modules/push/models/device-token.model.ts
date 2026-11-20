import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '@/modules/users/models/user.model';

export enum DeviceTokenPlatform {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
}

@Table({ tableName: 'device_token', timestamps: false })
export class DeviceToken extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => User)
  @Column({ field: 'user_id', type: DataType.INTEGER, allowNull: false })
  declare userId: number;

  @BelongsTo(() => User)
  declare user: User;

  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  declare token: string;

  @Column({
    type: DataType.ENUM(DeviceTokenPlatform.IOS, DeviceTokenPlatform.ANDROID),
    allowNull: false,
  })
  declare platform: DeviceTokenPlatform;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;

  @Column({ field: 'updated_at', type: DataType.DATE })
  declare updatedAt: Date;
}
