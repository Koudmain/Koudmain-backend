import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Document } from './models/document.model';
import { Contract } from './models/contract.model';
import { Invoice } from './models/invoice.model';
import { DocumentAssignment } from './models/document-assignment.model';
import { DocumentContext } from './models/document-context.model';

@Module({
  imports: [
    SequelizeModule.forFeature([Document, Contract, Invoice, DocumentAssignment, DocumentContext]),
  ],
  controllers: [],
  providers: [],
})
export class DocumentsModule {}
