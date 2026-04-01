import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '@/modules/users/models/user.model';
import { Company } from './company.model';

@Table({ tableName: 'company_member', timestamps: false })
export class CompanyMember extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => Company)
  @Column({ type: DataType.INTEGER })
  declare company_id: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER })
  declare user_id: number;

  @BelongsTo(() => User)
  user: User;

  @Column({ type: DataType.STRING(50) })
  declare role: string;
}