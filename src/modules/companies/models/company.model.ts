import {
  Column,
  Model,
  Table,
  DataType,
  HasMany,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { CompanyMember } from './company-member.model';
import { Address } from '@/modules/address/address.model';

@Table({ tableName: 'company', timestamps: false })
export class Company extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ field: 'owner_position', type: DataType.STRING(100), allowNull: true })
  declare ownerPosition: string | null;

  @Column({ field: 'company_type', type: DataType.STRING(100), allowNull: true })
  declare companyType: string | null;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare is_premium: boolean;

  @HasMany(() => CompanyMember)
  declare members: CompanyMember[];

  @ForeignKey(() => Address)
  @Column({
    type: DataType.INTEGER,
    field: 'address_id',
    allowNull: true,
  })
  declare addressId: number | null;

  @BelongsTo(() => Address)
  declare address: Address | null;
}
