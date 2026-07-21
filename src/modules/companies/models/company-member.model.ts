import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '@/modules/users/models/user.model';
import { Company } from './company.model';

@Table({ tableName: 'company_member', timestamps: false })
export class CompanyMember extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => Company)
  @Column({ type: DataType.INTEGER, field: 'company_id' })
  declare companyId: number;

  @BelongsTo(() => Company)
  declare company: Company;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, field: 'user_id' })
  declare userId: number;

  @BelongsTo(() => User)
  declare user: User;

  @Column({ type: DataType.STRING(50) })
  declare role: string;
}
