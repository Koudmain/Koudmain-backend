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
import { DocumensoModule } from '@/modules/documenso/documenso.module';
import { PdfModule } from '@/modules/pdf/pdf.module';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { Mission } from '@/modules/missions/mission.model';
import { Conversation } from '@/modules/chat/models/conversation.model';
import { User } from '@/modules/users/models/user.model';
import { DocumentsController } from './controllers/document.controller';
import { UserDocumentsController } from './controllers/user-documents.controller';
import { WorkerDocumentsController } from './controllers/worker-documents.controller';
import { CompanyDocumentsController } from './controllers/company-documents.controller';
import { DocumensoWebhookController } from './controllers/documenso-webhook.controller';
import { DocumentsService } from './services/document.service';
import { DocumentAccessService } from './services/document-access.service';
import { DocumentSignatureService } from './services/document-signature.service';
import { ContractGenerationService } from './services/contract-generation.service';

@Module({
  imports: [
    WorkersModule,
    CompaniesModule,
    S3Module,
    DocumensoModule,
    PdfModule,
    SequelizeModule.forFeature([
      Document,
      Contract,
      Invoice,
      DocumentAssignment,
      DocumentContext,
      SignatureEnvelope,
      WorkerProfile,
      CompanyMember,
      Publication,
      Mission,
      Conversation,
      User,
    ]),
  ],
  controllers: [
    DocumentsController,
    UserDocumentsController,
    WorkerDocumentsController,
    CompanyDocumentsController,
    DocumensoWebhookController,
  ],
  providers: [
    DocumentsService,
    DocumentAccessService,
    DocumentSignatureService,
    ContractGenerationService,
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
