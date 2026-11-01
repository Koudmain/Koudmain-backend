import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '@/modules/users/models/user.model';
import { Company } from '@/modules/companies/models/company.model';
import { Mission } from '@/modules/mission/models/mission.model';

export enum PaymentReportType {
  LATE_PAYMENT = 'LATE_PAYMENT',
  NO_PAYMENT = 'NO_PAYMENT',
}

export enum PaymentReportStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
}

@Table({ tableName: 'payment_report', timestamps: false })
export class PaymentReport extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @ForeignKey(() => Mission)
  @Column({ field: 'mission_id', type: DataType.INTEGER, allowNull: false })
  declare missionId: number;

  @BelongsTo(() => Mission)
  declare mission: Mission;

  @ForeignKey(() => User)
  @Column({ field: 'reporter_id', type: DataType.INTEGER, allowNull: false })
  declare reporterId: number;

  @BelongsTo(() => User)
  declare reporter: User;

  @ForeignKey(() => Company)
  @Column({ field: 'company_id', type: DataType.INTEGER, allowNull: false })
  declare companyId: number;

  @BelongsTo(() => Company)
  declare company: Company;

  @Column({ field: 'report_type', type: DataType.STRING(50), allowNull: false })
  declare reportType: PaymentReportType;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string | null;

  @Column({ type: DataType.STRING(50), defaultValue: PaymentReportStatus.OPEN })
  declare status: PaymentReportStatus;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;

  @Column({ field: 'resolved_at', type: DataType.DATE, allowNull: true })
  declare resolvedAt: Date | null;
}
