import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Document } from './models/document.model';
import { Contract } from './models/contract.model';
import { Invoice } from './models/invoice.model';
import { DocumentAssignment } from './models/document-assignment.model';
import { DocumentContext } from './models/document-context.model';
import { SignatureEnvelope } from './models/signature-envelope.model';
import { WorkersModule } from '@/modules/workers/workers.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { S3Module } from '@/modules/s3/s3.module';
import { DocumentsController } from './controllers/document.controller';
import { UserDocumentsController } from './controllers/user-documents.controller';
import { WorkerDocumentsController } from './controllers/worker-documents.controller';
import { CompanyDocumentsController } from './controllers/company-documents.controller';
import { DocumentsService } from './services/document.service';
import { DocumentAccessService } from './services/document-access.service';

@Module({
  imports: [
    WorkersModule,
    CompaniesModule,
    S3Module,
    SequelizeModule.forFeature([
      Document,
      Contract,
      Invoice,
      DocumentAssignment,
      DocumentContext,
      SignatureEnvelope,
    ]),
  ],
  controllers: [
    DocumentsController,
    UserDocumentsController,
    WorkerDocumentsController,
    CompanyDocumentsController,
  ],
  providers: [DocumentsService, DocumentAccessService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
