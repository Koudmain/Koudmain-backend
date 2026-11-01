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
  timestamps: false,
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
    allowNull: true,
  })
  declare publicationId: number | null;

  @ForeignKey(() => WorkerProfile)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare workerId: number | null;

  @ForeignKey(() => Company)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare companyId: number | null;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
  })
  declare finalPrice: string | null;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  declare paymentStatus: string | null;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare contractSignedAt: Date | null;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  declare status: string | null;

  @BelongsTo(() => Publication, 'publicationId')
  declare publication: Publication;

  @BelongsTo(() => WorkerProfile, 'workerId')
  declare worker: WorkerProfile;

  @BelongsTo(() => Company, 'companyId')
  declare company: Company;

  @HasOne(() => Contract, 'missionId')
  declare contract: Contract;

  @HasMany(() => Invoice, 'missionId')
  declare invoices: Invoice[];

  @HasMany(() => DocumentContext, 'missionId')
  declare documentContexts: DocumentContext[];
}
