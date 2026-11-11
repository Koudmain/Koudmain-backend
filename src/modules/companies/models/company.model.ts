import {
  Column,
  Model,
  Table,
  DataType,
  HasMany,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
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

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string | null;

  @Column({ field: 'logo_url', type: DataType.STRING(255), allowNull: true })
  declare logoUrl: string | null;

  @Column({ field: 'cover_image_url', type: DataType.STRING(255), allowNull: true })
  declare coverImageUrl: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare specialties: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare capacity: number | null;

  @Column({ field: 'team_size', type: DataType.STRING(100), allowNull: true })
  declare teamSize: string | null;

  @Column({ field: 'meal_provided', type: DataType.BOOLEAN, defaultValue: false })
  declare mealProvided: boolean;

  @Column({ field: 'dress_code', type: DataType.STRING(255), allowNull: true })
  declare dressCode: string | null;

  @Column({ field: 'siret_verified', type: DataType.BOOLEAN, defaultValue: false })
  declare siretVerified: boolean;

  @Column({ field: 'koudmain_validated', type: DataType.BOOLEAN, defaultValue: false })
  declare koudmainValidated: boolean;

  @Column({ field: 'average_rating', type: DataType.DECIMAL(3, 2), defaultValue: 0 })
  declare averageRating: number;

  @Column({ field: 'review_count', type: DataType.INTEGER, defaultValue: 0 })
  declare reviewCount: number;

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
