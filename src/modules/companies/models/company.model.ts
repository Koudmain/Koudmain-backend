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

  @Column(DataType.STRING)
  declare name: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare is_premium: boolean;

  @HasMany(() => CompanyMember)
  declare members: CompanyMember[];

  @ForeignKey(() => Address)
  @Column({
    type: DataType.INTEGER,
    field: 'address_id',
  })
  addressId: number;

  @BelongsTo(() => Address)
  address: Address;
}
