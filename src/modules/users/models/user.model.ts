import { Column, Model, Table, DataType, HasMany } from 'sequelize-typescript';
import { Review } from '@/modules/review/models/review.model';

export enum UserRole {
  WORKER = 'WORKER',
  EMPLOYER = 'EMPLOYER',
}

@Table({ tableName: 'user', timestamps: false })
export class User extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true })
  declare id: number;

  @Column({ type: DataType.STRING, unique: false })
  declare first_name: string;

  @Column({ type: DataType.STRING, unique: false })
  declare last_name: string;

  @Column({ type: DataType.STRING, unique: false })
  declare profile_picture_url: string;

  @HasMany(() => Review, 'rated_id')
  declare reviews: Review[];

  @Column({ type: DataType.STRING, unique: true })
  declare email: string;

  @Column(DataType.STRING)
  declare password: string;

  @Column({
    type: DataType.ENUM(UserRole.WORKER, UserRole.EMPLOYER),
    allowNull: false,
  })
  declare role: UserRole;

  @Column({ field: 'phone_number', type: DataType.STRING, unique: false })
  declare phone_number: string;

  @Column({ field: 'birth_date', type: DataType.DATEONLY })
  declare birth_date: string;

  @Column({ field: 'email_verified_at', type: DataType.DATE })
  declare email_verified_at: Date;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;
}
