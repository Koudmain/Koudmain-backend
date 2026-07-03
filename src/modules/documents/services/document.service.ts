import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Document, DocumentCategory } from '@/modules/documents/models/document.model';
import { DocumentAssignment } from '@/modules/documents/models/document-assignment.model';
import { DocumentContext } from '@/modules/documents/models/document-context.model';
import { Contract } from '@/modules/documents/models/contract.model';
import { Invoice } from '@/modules/documents/models/invoice.model';
import { SignatureEnvelope } from '@/modules/documents/models/signature-envelope.model';
import { CreateDocumentDto } from '@/modules/documents/dtos/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(Document) private documentModel: typeof Document,
    @InjectModel(DocumentAssignment) private assignmentModel: typeof DocumentAssignment,
    @InjectModel(DocumentContext) private contextModel: typeof DocumentContext,
    @InjectModel(Contract) private contractModel: typeof Contract,
    @InjectModel(Invoice) private invoiceModel: typeof Invoice,
  ) {}

  async create(dto: CreateDocumentDto): Promise<Document | null> {
    const maxId = await this.documentModel.max('id');
    const nextId = (typeof maxId === 'number' ? maxId : 0) + 1;

    const createdDocument = await this.documentModel.create({
      id: nextId,
      name: dto.name,
      originalFilename: dto.originalFilename ?? null,
      filePath: dto.filePath,
      category: dto.category,
      sizeBytes: dto.sizeBytes ?? null,
      mimeType: dto.mimeType ?? null,
      createdAt: new Date(),
    });

    const maxAssignmentId = await this.assignmentModel.max('id');
    const nextAssignmentId = (typeof maxAssignmentId === 'number' ? maxAssignmentId : 0) + 1;

    await this.assignmentModel.create({
      id: nextAssignmentId,
      documentId: createdDocument.id,
      workerId: dto.workerId ?? null,
      companyId: dto.companyId ?? null,
      type: dto.assignmentType,
      verified: false,
    });

    if (dto.category === DocumentCategory.CONTRACT && dto.missionId) {
      await this.contractModel.create({
        documentId: createdDocument.id,
        documentCategory: DocumentCategory.CONTRACT,
        missionId: dto.missionId,
        status: 'PENDING',
      });
    }

    if (dto.conversationId || dto.missionId || dto.publicationId) {
      await this.contextModel.create({
        documentId: createdDocument.id,
        conversationId: dto.conversationId,
        missionId: dto.missionId,
        publicationId: dto.publicationId,
      });
    }

    return this.getById(createdDocument.id);
  }

  async getAll(): Promise<Document[]> {
    return this.documentModel.findAll({
      include: ['assignments', 'context', Contract, Invoice, SignatureEnvelope],
    });
  }

  async getById(id: number): Promise<Document | null> {
    return this.documentModel.findByPk(id, {
      include: ['assignments', 'context', Contract, Invoice, SignatureEnvelope],
    });
  }

  async delete(documentId: number): Promise<number> {
    await this.documentModel.destroy({
      where: {
        id: documentId,
      },
    });
    return documentId;
  }
}
