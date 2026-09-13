import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  HasOne,
} from 'sequelize-typescript';
import { Publication } from '@/modules/publication/models/publication.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { Company } from '@/modules/companies/models/company.model';
import { Contract } from '@/modules/documents/models/contract.model';
import { Invoice } from '@/modules/documents/models/invoice.model';
import { DocumentContext } from '@/modules/documents/models/document-context.model';

@Table({
  tableName: 'mission',
  underscored: true,
})
export class Mission extends Model<Mission> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  })
  declare id: number;

  @ForeignKey(() => Publication)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare publicationId: number;

  @ForeignKey(() => WorkerProfile)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare workerId: number;

  @ForeignKey(() => Company)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare companyId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare status: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare startedAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare endedAt: Date;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
  })
  declare hourlyRate: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare estimatedHours: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare createdAt: Date;

  @BelongsTo(() => Publication, 'publicationId')
  publication: Publication;

  @BelongsTo(() => WorkerProfile, 'workerId')
  worker: WorkerProfile;

  @BelongsTo(() => Company, 'companyId')
  company: Company;

  @HasOne(() => Contract, 'missionId')
  contract: Contract;

  @HasMany(() => Invoice, 'missionId')
  invoices: Invoice[];

  @HasMany(() => DocumentContext, 'missionId')
  documentContexts: DocumentContext[];
}
