import { Column, Model, Table, DataType, HasMany } from 'sequelize-typescript';
import { Review } from '../../review/models/review.model';

@Table({ tableName: 'user', timestamps: false })
export class User extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

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

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare is_worker_active: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare is_employer_active: boolean;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;
}
