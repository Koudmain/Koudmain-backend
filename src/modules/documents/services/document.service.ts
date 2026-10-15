import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { IncludeOptions, Op, Transaction, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import {
  Document,
  DocumentCategory,
  DocumentAttributes,
} from '@/modules/documents/models/document.model';
import {
  DocumentAssignment,
  DocumentAssignmentAttributes,
} from '@/modules/documents/models/document-assignment.model';
import {
  DocumentContext,
  DocumentContextAttributes,
} from '@/modules/documents/models/document-context.model';
import { Contract, ContractAttributes } from '@/modules/documents/models/contract.model';
import { Invoice, InvoiceAttributes } from '@/modules/documents/models/invoice.model';
import {
  SignatureEnvelope,
  SignatureProvider,
  SignatureStatus,
  SignatureEnvelopeAttributes,
} from '@/modules/documents/models/signature-envelope.model';
import { CreateDocumentDto } from '@/modules/documents/dtos/create-document.dto';
import { UpdateDocumentDto } from '@/modules/documents/dtos/update-document.dto';
import { QueryDocumentDto } from '@/modules/documents/dtos/query-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private sequelize: Sequelize,
    @InjectModel(Document) private documentModel: typeof Document,
    @InjectModel(DocumentAssignment) private assignmentModel: typeof DocumentAssignment,
    @InjectModel(DocumentContext) private contextModel: typeof DocumentContext,
    @InjectModel(Contract) private contractModel: typeof Contract,
    @InjectModel(Invoice) private invoiceModel: typeof Invoice,
    @InjectModel(SignatureEnvelope) private signatureEnvelopeModel: typeof SignatureEnvelope,
  ) {}

  async create(dto: CreateDocumentDto): Promise<Document> {
    return this.sequelize.transaction(async (transaction) => {
      const createdDocument = await this.documentModel.create(
        {
          name: dto.name,
          originalFilename: dto.originalFilename ?? null,
          filePath: dto.filePath,
          category: dto.category,
          sizeBytes: dto.sizeBytes ?? null,
          mimeType: dto.mimeType ?? null,
        },
        { transaction },
      );

      if (dto.workerId || dto.companyId || dto.userId || dto.assignmentType) {
        await this.assignmentModel.create(
          {
            documentId: createdDocument.id,
            workerId: dto.workerId ?? null,
            companyId: dto.companyId ?? null,
            userId: dto.userId ?? null,
            type: dto.assignmentType ?? 'GENERAL',
            verified: false,
          },
          { transaction },
        );
      }

      if (dto.conversationId || dto.missionId || dto.publicationId) {
        await this.contextModel.create(
          {
            documentId: createdDocument.id,
            conversationId: dto.conversationId ?? null,
            missionId: dto.missionId ?? null,
            publicationId: dto.publicationId ?? null,
          },
          { transaction },
        );
      }

      if (dto.category === DocumentCategory.CONTRACT && dto.missionId) {
        await this.contractModel.create(
          {
            documentId: createdDocument.id,
            documentCategory: DocumentCategory.CONTRACT,
            missionId: dto.missionId,
            status: dto.contractStatus ?? 'PENDING',
          },
          { transaction },
        );
      }

      if (dto.category === DocumentCategory.INVOICE && (dto.missionId || dto.invoiceNumber)) {
        await this.invoiceModel.create(
          {
            documentId: createdDocument.id,
            documentCategory: DocumentCategory.INVOICE,
            missionId: dto.missionId ?? 0,
            invoiceNumber: dto.invoiceNumber ?? `INV-${Date.now()}`,
            amountHt: dto.amountHt ?? 0,
            amountTtc: dto.amountTtc ?? 0,
            feeAmount: dto.feeAmount ?? 0,
            status: 'DRAFT',
          },
          { transaction },
        );
      }

      if (dto.externalDocumentId) {
        await this.signatureEnvelopeModel.create(
          {
            documentId: createdDocument.id,
            provider: dto.signatureProvider ?? SignatureProvider.DOCUMENSO,
            externalDocumentId: dto.externalDocumentId,
            status: SignatureStatus.PENDING,
          },
          { transaction },
        );
      }

      const freshDoc = await this.getById(createdDocument.id, transaction);
      if (!freshDoc) {
        throw new NotFoundException('Erreur lors de la création du document');
      }
      return freshDoc;
    });
  }

  async findAll(query?: QueryDocumentDto): Promise<Document[]> {
    const whereClause: WhereOptions<Document> = {};
    const include: IncludeOptions[] = [
      { model: DocumentAssignment, as: 'assignments' },
      { model: DocumentContext, as: 'context' },
      { model: Contract, as: 'contract' },
      { model: Invoice, as: 'invoice' },
      { model: SignatureEnvelope, as: 'signatureEnvelope' },
    ];

    if (query?.category) {
      (whereClause as Record<string, unknown>).category = query.category;
    }

    if (query?.search) {
      (whereClause as Record<string, unknown>).name = { [Op.iLike]: `%${query.search}%` };
    }

    if (query?.workerId || query?.companyId || query?.userId) {
      const assignmentWhere: Partial<DocumentAssignmentAttributes> = {};
      if (query.workerId) assignmentWhere.workerId = query.workerId;
      if (query.companyId) assignmentWhere.companyId = query.companyId;
      if (query.userId) assignmentWhere.userId = query.userId;

      include[0] = {
        model: DocumentAssignment,
        as: 'assignments',
        where: assignmentWhere,
        required: true,
      };
    }

    if (query?.missionId || query?.conversationId || query?.publicationId) {
      const contextWhere: Partial<DocumentContextAttributes> = {};
      if (query.missionId) contextWhere.missionId = query.missionId;
      if (query.conversationId) contextWhere.conversationId = query.conversationId;
      if (query.publicationId) contextWhere.publicationId = query.publicationId;

      include[1] = {
        model: DocumentContext,
        as: 'context',
        where: contextWhere,
        required: true,
      };
    }

    return this.documentModel.findAll({
      where: whereClause,
      include,
      order: [['createdAt', 'DESC']],
    });
  }

  async getById(id: number, transaction?: Transaction): Promise<Document | null> {
    return this.documentModel.findByPk(id, {
      include: [
        { model: DocumentAssignment, as: 'assignments' },
        { model: DocumentContext, as: 'context' },
        { model: Contract, as: 'contract' },
        { model: Invoice, as: 'invoice' },
        { model: SignatureEnvelope, as: 'signatureEnvelope' },
      ],
      transaction,
    });
  }

  async getByUserId(userId: number): Promise<Document[]> {
    return this.findAll({ userId });
  }

  async getByWorkerId(workerId: number): Promise<Document[]> {
    return this.findAll({ workerId });
  }

  async getByCompanyId(companyId: number): Promise<Document[]> {
    return this.findAll({ companyId });
  }

  async getByMissionId(missionId: number): Promise<Document[]> {
    return this.findAll({ missionId });
  }

  async update(id: number, dto: UpdateDocumentDto): Promise<Document> {
    return this.sequelize.transaction(async (transaction) => {
      const document = await this.getById(id, transaction);
      if (!document) {
        throw new NotFoundException(`Document #${id} introuvable`);
      }

      const docUpdates: Partial<DocumentAttributes> = {};
      if (dto.name !== undefined) docUpdates.name = dto.name;
      if (dto.originalFilename !== undefined) docUpdates.originalFilename = dto.originalFilename;
      if (dto.filePath !== undefined) docUpdates.filePath = dto.filePath;
      if (dto.category !== undefined) docUpdates.category = dto.category;
      if (dto.sizeBytes !== undefined) docUpdates.sizeBytes = dto.sizeBytes;
      if (dto.mimeType !== undefined) docUpdates.mimeType = dto.mimeType;

      if (Object.keys(docUpdates).length > 0) {
        await document.update(docUpdates, { transaction });
      }

      if (dto.verified !== undefined && document.assignments && document.assignments.length > 0) {
        await this.assignmentModel.update(
          { verified: dto.verified },
          { where: { documentId: id }, transaction },
        );
      }

      if (
        (dto.contractStatus !== undefined ||
          dto.signedAt !== undefined ||
          dto.workerSignatureId !== undefined ||
          dto.employerSignatureId !== undefined) &&
        document.contract
      ) {
        const contractUpdates: Partial<ContractAttributes> = {};
        if (dto.contractStatus !== undefined) contractUpdates.status = dto.contractStatus;
        if (dto.signedAt !== undefined) contractUpdates.signedAt = dto.signedAt;
        if (dto.workerSignatureId !== undefined)
          contractUpdates.workerSignatureId = dto.workerSignatureId;
        if (dto.employerSignatureId !== undefined)
          contractUpdates.employerSignatureId = dto.employerSignatureId;

        await document.contract.update(contractUpdates, { transaction });
      }

      if (
        (dto.invoiceStatus !== undefined ||
          dto.amountHt !== undefined ||
          dto.amountTtc !== undefined ||
          dto.feeAmount !== undefined) &&
        document.invoice
      ) {
        const invoiceUpdates: Partial<InvoiceAttributes> = {};
        if (dto.invoiceStatus !== undefined) invoiceUpdates.status = dto.invoiceStatus;
        if (dto.amountHt !== undefined) invoiceUpdates.amountHt = dto.amountHt;
        if (dto.amountTtc !== undefined) invoiceUpdates.amountTtc = dto.amountTtc;
        if (dto.feeAmount !== undefined) invoiceUpdates.feeAmount = dto.feeAmount;

        await document.invoice.update(invoiceUpdates, { transaction });
      }

      if (dto.signatureStatus || dto.externalDocumentId || dto.signatureProvider) {
        if (document.signatureEnvelope) {
          const envelopeUpdates: Partial<SignatureEnvelopeAttributes> = {};
          if (dto.signatureStatus !== undefined) envelopeUpdates.status = dto.signatureStatus;
          if (dto.externalDocumentId !== undefined)
            envelopeUpdates.externalDocumentId = dto.externalDocumentId;
          if (dto.signatureProvider !== undefined) envelopeUpdates.provider = dto.signatureProvider;

          await document.signatureEnvelope.update(envelopeUpdates, { transaction });
        } else if (dto.externalDocumentId) {
          await this.signatureEnvelopeModel.create(
            {
              documentId: id,
              provider: dto.signatureProvider ?? SignatureProvider.DOCUMENSO,
              externalDocumentId: dto.externalDocumentId,
              status: dto.signatureStatus ?? SignatureStatus.PENDING,
            },
            { transaction },
          );
        }
      }

      const updatedDoc = await this.getById(id, transaction);
      return updatedDoc!;
    });
  }

  async delete(documentId: number): Promise<{ message: string; id: number }> {
    return this.sequelize.transaction(async (transaction) => {
      const document = await this.getById(documentId, transaction);
      if (!document) {
        throw new NotFoundException(`Document #${documentId} introuvable`);
      }

      await this.assignmentModel.destroy({ where: { documentId }, transaction });
      await this.contextModel.destroy({ where: { documentId }, transaction });
      await this.contractModel.destroy({ where: { documentId }, transaction });
      await this.invoiceModel.destroy({ where: { documentId }, transaction });
      await this.signatureEnvelopeModel.destroy({ where: { documentId }, transaction });

      await document.destroy({ transaction });

      return {
        message: 'Document supprimé avec succès',
        id: documentId,
      };
    });
  }
}
