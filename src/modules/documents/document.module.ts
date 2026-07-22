import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Document } from './models/document.model';
import { Contract } from './models/contract.model';
import { Invoice } from './models/invoice.model';
import { DocumentAssignment } from './models/document-assignment.model';
import { DocumentContext } from './models/document-context.model';
import { SignatureEnvelope } from './models/signature-envelope.model';
import { WorkersModule } from '@/modules/workers/workers.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [
    WorkersModule,
    CompaniesModule,
    SequelizeModule.forFeature([
      Document,
      Contract,
      Invoice,
      DocumentAssignment,
      DocumentContext,
      SignatureEnvelope,
    ]),
  ],
  controllers: [],
  providers: [],
})
export class DocumentsModule {}
