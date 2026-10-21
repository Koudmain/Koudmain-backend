import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '@/modules/users/models/user.model';
import { Company } from '@/modules/companies/models/company.model';
import { Mission } from '@/modules/mission/models/mission.model';

export enum ReviewType {
  WORKER_TO_COMPANY = 'Worker_to_Company',
  COMPANY_TO_WORKER = 'Company_to_Worker',
}

@Table({ tableName: 'review', timestamps: false })
export class Review extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => Mission)
  @Column({ field: 'mission_id', type: DataType.INTEGER })
  declare missionId: number;

  @BelongsTo(() => Mission)
  declare mission: Mission;

  @Column({ field: 'reviewer_id', type: DataType.INTEGER })
  declare reviewerId: number;

  @BelongsTo(() => User, 'reviewerId')
  declare reviewer: User;

  @Column({ type: DataType.INTEGER })
  declare rated_id: number;

  @ForeignKey(() => Company)
  @Column({ field: 'rated_company_id', type: DataType.INTEGER, allowNull: true })
  declare ratedCompanyId: number | null;

  @BelongsTo(() => Company, 'ratedCompanyId')
  declare ratedCompany: Company | null;

  // Author of a Company_to_Worker review: the company (reviewerId keeps the member who wrote it)
  @ForeignKey(() => Company)
  @Column({ field: 'reviewer_company_id', type: DataType.INTEGER, allowNull: true })
  declare reviewerCompanyId: number | null;

  @BelongsTo(() => Company, 'reviewerCompanyId')
  declare reviewerCompany: Company | null;

  @Column({ type: DataType.INTEGER })
  declare rating: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare comment: string | null;

  @Column({ type: DataType.STRING(20) })
  declare type: ReviewType;

  @Column({ field: 'payment_on_time', type: DataType.BOOLEAN, allowNull: true })
  declare paymentOnTime: boolean | null;

  @Column({ field: 'mission_matches_listing', type: DataType.BOOLEAN, allowNull: true })
  declare missionMatchesListing: boolean | null;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;
}
