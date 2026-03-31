import { Column, Model, Table, DataType, ForeignKey } from 'sequelize-typescript';
import { User } from '@/modules/users/models/user.model';
import { Company } from './company.model';

@Table({ tableName: 'company_member', timestamps: false })
export class CompanyMember extends Model {
  @ForeignKey(() => Company)
  @Column(DataType.INTEGER)
  declare company_id: number;

  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  declare user_id: number;

  @Column(DataType.STRING)
  declare role: string; // 'Owner', 'Manager', etc.
}