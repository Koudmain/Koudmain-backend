import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
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
  DocumentAssignmentCreationAttributes,
} from '@/modules/documents/models/document-assignment.model';
import {
  DocumentContext,
  DocumentContextAttributes,
} from '@/modules/documents/models/document-context.model';
import { Contract } from '@/modules/documents/models/contract.model';
import { Invoice, InvoiceAttributes } from '@/modules/documents/models/invoice.model';
import { SignatureEnvelope } from '@/modules/documents/models/signature-envelope.model';
import { CreateDocumentDto } from '@/modules/documents/dtos/create-document.dto';
import { UpdateDocumentDto } from '@/modules/documents/dtos/update-document.dto';
import { QueryDocumentDto } from '@/modules/documents/dtos/query-document.dto';
import {
  DocumentAccessService,
  DocumentActor,
} from '@/modules/documents/services/document-access.service';
import { S3Service } from '@/modules/s3/services/s3.service';
import { PutResult, StorageCategory, StoredObjectRef, StoredVersion } from '@/modules/s3/s3.types';

export interface DocumentDownload {
  url: string;
  expiresIn: number;
}

type ManageAction = 'edit' | 'delete';

const STORAGE_CATEGORIES = {
  [DocumentCategory.CONTRACT]: StorageCategory.CONTRACT,
  [DocumentCategory.INVOICE]: StorageCategory.INVOICE,
  [DocumentCategory.IDENTITY]: StorageCategory.IDENTITY,
  [DocumentCategory.RIB]: StorageCategory.RIB,
  [DocumentCategory.DIPLOMA]: StorageCategory.DIPLOMA,
  [DocumentCategory.KBIS]: StorageCategory.KBIS,
  [DocumentCategory.OTHER]: StorageCategory.OTHER,
} as const satisfies Record<DocumentCategory, StorageCategory>;

const MISSION_CATEGORIES: ReadonlySet<DocumentCategory> = new Set([
  DocumentCategory.CONTRACT,
  DocumentCategory.INVOICE,
]);

const DOCUMENT_INCLUDES: IncludeOptions[] = [
  { model: DocumentAssignment, as: 'assignments' },
  { model: DocumentContext, as: 'context' },
  { model: Contract, as: 'contract' },
  { model: Invoice, as: 'invoice' },
  { model: SignatureEnvelope, as: 'signatureEnvelope' },
];

@Injectable()
export class DocumentsService {
  static readonly DOWNLOAD_URL_TTL = 900;

  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private sequelize: Sequelize,
    private readonly s3Service: S3Service,
    private readonly accessService: DocumentAccessService,
    @InjectModel(Document) private documentModel: typeof Document,
    @InjectModel(DocumentAssignment) private assignmentModel: typeof DocumentAssignment,
    @InjectModel(DocumentContext) private contextModel: typeof DocumentContext,
    @InjectModel(Contract) private contractModel: typeof Contract,
    @InjectModel(Invoice) private invoiceModel: typeof Invoice,
    @InjectModel(SignatureEnvelope) private signatureEnvelopeModel: typeof SignatureEnvelope,
  ) {}

  async create(
    userId: number,
    dto: CreateDocumentDto,
    file: Express.Multer.File,
  ): Promise<Document> {
    const actor = await this.accessService.resolveActor(userId);
    const assignment = await this.authorizeCreation(actor, dto);
    const mimeType = DocumentsService.detectMimeType(file.buffer);
    const ref: StoredObjectRef = {
      category: STORAGE_CATEGORIES[dto.category],
      documentId: await this.reserveDocumentId(),
    };
    const stored = await this.s3Service.put(ref, file.buffer, mimeType);

    try {
      return await this.sequelize.transaction(async (transaction) => {
        await this.insertDocument(dto, file, mimeType, stored, assignment, transaction);

        return (await this.getById(stored.documentId, transaction))!;
      });
    } catch (error) {
      await this.purgeStoredFile(ref);
      throw error;
    }
  }

  async findAll(userId: number, query: QueryDocumentDto = {}): Promise<Document[]> {
    const actor = await this.accessService.resolveActor(userId);
    const conditions: WhereOptions<Document>[] = [
      Sequelize.literal(`"Document"."id" IN ${this.accessService.readableDocumentIds(actor)}`),
    ];
    const include = [...DOCUMENT_INCLUDES];

    if (query.category) conditions.push({ category: query.category });
    if (query.search) conditions.push({ name: { [Op.iLike]: `%${query.search}%` } });

    if (query.workerId || query.companyId || query.userId) {
      const assignmentWhere: Partial<DocumentAssignmentAttributes> = {};
      if (query.workerId) assignmentWhere.workerId = query.workerId;
      if (query.companyId) assignmentWhere.companyId = query.companyId;
      if (query.userId) assignmentWhere.userId = query.userId;

      include[0] = { ...include[0], where: assignmentWhere, required: true };
    }

    if (query.missionId || query.conversationId || query.publicationId) {
      const contextWhere: Partial<DocumentContextAttributes> = {};
      if (query.missionId) contextWhere.missionId = query.missionId;
      if (query.conversationId) contextWhere.conversationId = query.conversationId;
      if (query.publicationId) contextWhere.publicationId = query.publicationId;

      include[1] = { ...include[1], where: contextWhere, required: true };
    }

    return this.documentModel.findAll({
      where: { [Op.and]: conditions },
      include,
      order: [['createdAt', 'DESC']],
    });
  }

  async findOne(userId: number, id: number): Promise<Document> {
    const actor = await this.accessService.resolveActor(userId);

    return this.findReadable(actor, id);
  }

  async update(userId: number, id: number, dto: UpdateDocumentDto): Promise<Document> {
    const actor = await this.accessService.resolveActor(userId);

    return this.sequelize.transaction(async (transaction) => {
      const document = await this.findReadable(actor, id, transaction);
      const invoiceUpdates: Partial<InvoiceAttributes> = {};
      if (dto.amountHt !== undefined) invoiceUpdates.amountHt = dto.amountHt;
      if (dto.amountTtc !== undefined) invoiceUpdates.amountTtc = dto.amountTtc;
      if (dto.feeAmount !== undefined) invoiceUpdates.feeAmount = dto.feeAmount;

      if (Object.keys(invoiceUpdates).length > 0 && !document.invoice) {
        throw new BadRequestException('Les montants ne concernent que les factures');
      }

      await this.assertCanManage(actor, document, 'edit', transaction);

      const docUpdates: Partial<DocumentAttributes> = {};
      if (dto.name !== undefined) docUpdates.name = dto.name;

      if (Object.keys(docUpdates).length > 0) {
        await document.update(docUpdates, { transaction });
      }
      if (Object.keys(invoiceUpdates).length > 0) {
        await document.invoice.update(invoiceUpdates, { transaction });
      }

      return (await this.getById(id, transaction))!;
    });
  }

  async delete(userId: number, documentId: number): Promise<{ message: string; id: number }> {
    const actor = await this.accessService.resolveActor(userId);
    let storedRef: StoredObjectRef | undefined;

    const result = await this.sequelize.transaction(async (transaction) => {
      const document = await this.findReadable(actor, documentId, transaction);

      await this.assertCanManage(actor, document, 'delete', transaction);

      storedRef = DocumentsService.storageRef(document);
      await this.assertNotSealed(storedRef);

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

    if (storedRef) {
      await this.purgeStoredFile(storedRef);
    }

    return result;
  }

  async replaceFile(userId: number, id: number, file: Express.Multer.File): Promise<Document> {
    const actor = await this.accessService.resolveActor(userId);
    const mimeType = DocumentsService.detectMimeType(file.buffer);

    return this.sequelize.transaction(async (transaction) => {
      const document = await this.findReadable(actor, id, transaction);

      await this.assertCanManage(actor, document, 'edit', transaction);

      const stored = await this.s3Service.put(
        DocumentsService.storageRef(document),
        file.buffer,
        mimeType,
      );

      await document.update(
        {
          originalFilename: DocumentsService.originalFilename(file),
          sizeBytes: file.size,
          mimeType,
          versionId: stored.versionId,
          checksumSha256: stored.checksum,
        },
        { transaction },
      );

      return (await this.getById(id, transaction))!;
    });
  }

  async getDownloadUrl(
    userId: number,
    id: number,
    options: { inline?: boolean; versionId?: string } = {},
  ): Promise<DocumentDownload> {
    const document = await this.findOne(userId, id);
    const url = await this.s3Service.getDownloadUrl(DocumentsService.storageRef(document), {
      filename: document.originalFilename ?? document.name,
      inline: options.inline,
      versionId: options.versionId,
      expiresIn: DocumentsService.DOWNLOAD_URL_TTL,
    });

    return { url, expiresIn: DocumentsService.DOWNLOAD_URL_TTL };
  }

  async listFileVersions(userId: number, id: number): Promise<StoredVersion[]> {
    const document = await this.findOne(userId, id);

    return this.s3Service.listVersions(DocumentsService.storageRef(document));
  }

  private async authorizeCreation(
    actor: DocumentActor,
    dto: CreateDocumentDto,
  ): Promise<Omit<DocumentAssignmentCreationAttributes, 'documentId'>> {
    const hasInvoiceFields =
      dto.invoiceNumber !== undefined ||
      dto.amountHt !== undefined ||
      dto.amountTtc !== undefined ||
      dto.feeAmount !== undefined;

    if (hasInvoiceFields && dto.category !== DocumentCategory.INVOICE) {
      throw new BadRequestException('Numéro et montants réservés aux factures');
    }

    if (dto.conversationId) {
      const parties = await this.accessService.conversationParties(dto.conversationId);
      if (!parties || !DocumentAccessService.isParty(actor, parties)) {
        throw new ForbiddenException('Vous ne participez pas à cette conversation');
      }
    }

    if (dto.publicationId) {
      const companyId = await this.accessService.publicationCompanyId(dto.publicationId);
      if (companyId === null || !actor.companyIds.includes(companyId)) {
        throw new ForbiddenException("Cette publication n'appartient pas à votre entreprise");
      }
    }

    const missionParties = dto.missionId
      ? await this.accessService.missionParties(dto.missionId)
      : null;

    if (
      dto.missionId &&
      (!missionParties || !DocumentAccessService.isParty(actor, missionParties))
    ) {
      throw new ForbiddenException('Vous ne participez pas à cette mission');
    }

    if (MISSION_CATEGORIES.has(dto.category)) {
      if (!missionParties) {
        throw new BadRequestException('missionId est obligatoire pour un contrat ou une facture');
      }
      if (dto.userId !== undefined || dto.workerId !== undefined || dto.companyId !== undefined) {
        throw new BadRequestException(
          'Un contrat ou une facture est rattaché aux parties de la mission, pas à userId, workerId ou companyId',
        );
      }
      if (!DocumentAccessService.isCompanySide(actor, missionParties)) {
        throw new ForbiddenException("Seule l'entreprise de la mission peut déposer ce document");
      }

      return {
        userId: null,
        workerId: missionParties.workerId,
        companyId: missionParties.companyId,
        type: dto.category,
        verified: false,
      };
    }

    if (dto.userId !== undefined && dto.userId !== actor.userId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas rattacher un document à un autre utilisateur',
      );
    }
    if (dto.workerId !== undefined && dto.workerId !== actor.workerId) {
      throw new ForbiddenException("Ce profil worker n'est pas le vôtre");
    }
    if (dto.companyId !== undefined && !actor.companyIds.includes(dto.companyId)) {
      throw new ForbiddenException("Vous n'êtes pas membre de cette entreprise");
    }

    const hasOwner =
      dto.userId !== undefined || dto.workerId !== undefined || dto.companyId !== undefined;

    return {
      userId: hasOwner ? (dto.userId ?? null) : actor.userId,
      workerId: dto.workerId ?? null,
      companyId: dto.companyId ?? null,
      type: dto.assignmentType ?? dto.category,
      verified: false,
    };
  }

  private async assertCanManage(
    actor: DocumentActor,
    document: Document,
    action: ManageAction,
    transaction: Transaction,
  ): Promise<void> {
    const missionId = document.contract?.missionId ?? document.invoice?.missionId;

    if (missionId) {
      const parties = await this.accessService.missionParties(missionId, transaction);
      const allowed =
        parties !== null &&
        (action === 'delete'
          ? DocumentAccessService.isParty(actor, parties)
          : DocumentAccessService.isCompanySide(actor, parties));

      if (!allowed) {
        throw new ForbiddenException(
          action === 'delete'
            ? 'Seules les parties de la mission peuvent supprimer ce document'
            : "Seule l'entreprise de la mission peut modifier ce document",
        );
      }
      if (!DocumentsService.isDraft(document)) {
        throw new ConflictException(
          document.contract
            ? 'Ce contrat est signé: il ne peut plus être modifié ni supprimé'
            : 'Cette facture est émise: elle ne peut plus être modifiée ni supprimée',
        );
      }
      return;
    }

    if (!DocumentsService.isOwner(actor, document)) {
      throw new ForbiddenException("Vous n'êtes pas propriétaire de ce document");
    }
  }

  private async findReadable(
    actor: DocumentActor,
    id: number,
    transaction?: Transaction,
  ): Promise<Document> {
    const document = await this.getById(id, transaction);

    if (!document || !(await this.accessService.canRead(actor, id, transaction))) {
      throw new NotFoundException(`Document #${id} introuvable`);
    }
    return document;
  }

  private async getById(id: number, transaction?: Transaction): Promise<Document | null> {
    return this.documentModel.findByPk(id, { include: DOCUMENT_INCLUDES, transaction });
  }

  private async reserveDocumentId(): Promise<number> {
    const [rows] = await this.sequelize.query(
      `SELECT nextval(pg_get_serial_sequence('document', 'id')) AS id`,
    );

    return Number((rows as Array<{ id: string }>)[0].id);
  }

  private async insertDocument(
    dto: CreateDocumentDto,
    file: Express.Multer.File,
    mimeType: string,
    stored: PutResult,
    assignment: Omit<DocumentAssignmentCreationAttributes, 'documentId'>,
    transaction: Transaction,
  ): Promise<void> {
    const documentId = stored.documentId;

    await this.documentModel.create(
      {
        id: documentId,
        name: dto.name,
        originalFilename: DocumentsService.originalFilename(file),
        filePath: stored.key,
        category: dto.category,
        versionId: stored.versionId,
        checksumSha256: stored.checksum,
        sizeBytes: file.size,
        mimeType,
      },
      { transaction },
    );

    await this.assignmentModel.create({ ...assignment, documentId }, { transaction });

    if (dto.conversationId || dto.missionId || dto.publicationId) {
      await this.contextModel.create(
        {
          documentId,
          conversationId: dto.conversationId ?? null,
          missionId: dto.missionId ?? null,
          publicationId: dto.publicationId ?? null,
        },
        { transaction },
      );
    }

    if (dto.category === DocumentCategory.CONTRACT) {
      await this.contractModel.create(
        {
          documentId,
          documentCategory: DocumentCategory.CONTRACT,
          missionId: dto.missionId!,
          status: 'PENDING',
        },
        { transaction },
      );
    }

    if (dto.category === DocumentCategory.INVOICE) {
      await this.invoiceModel.create(
        {
          documentId,
          documentCategory: DocumentCategory.INVOICE,
          missionId: dto.missionId!,
          invoiceNumber: dto.invoiceNumber ?? `INV-${Date.now()}`,
          amountHt: dto.amountHt ?? 0,
          amountTtc: dto.amountTtc ?? 0,
          feeAmount: dto.feeAmount ?? 0,
          status: 'DRAFT',
        },
        { transaction },
      );
    }
  }

  private async assertNotSealed(ref: StoredObjectRef): Promise<void> {
    try {
      const current = await this.s3Service.head(ref);

      if (current.sealed) {
        throw new ConflictException(
          `Le document ${ref.documentId} est scellé jusqu'au ${current.retainUntil?.toISOString()}: il ne peut pas être supprimé.`,
        );
      }
    } catch (error) {
      if (error instanceof NotFoundException) return;
      throw error;
    }
  }

  private async purgeStoredFile(ref: StoredObjectRef): Promise<void> {
    try {
      const { errors } = await this.s3Service.deleteVersions(ref);

      if (errors.length > 0) {
        this.logger.error(
          `Suppression incomplète du fichier ${this.s3Service.buildKey(ref)}: ${errors.map((e) => e.message).join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Échec de suppression du fichier ${this.s3Service.buildKey(ref)}`,
        error as Error,
      );
    }
  }

  private static isOwner(actor: DocumentActor, document: Document): boolean {
    return (document.assignments ?? []).some(
      (assignment) =>
        assignment.userId === actor.userId ||
        (assignment.workerId !== null && assignment.workerId === actor.workerId) ||
        (assignment.companyId !== null && actor.companyIds.includes(assignment.companyId)),
    );
  }

  private static isDraft(document: Document): boolean {
    if (document.contract) {
      return !document.contract.signedAt && (document.contract.status ?? 'PENDING') === 'PENDING';
    }
    if (document.invoice) {
      return (document.invoice.status ?? 'DRAFT') === 'DRAFT';
    }
    return true;
  }

  private static detectMimeType(body: Buffer): string {
    if (body.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
    if (body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return 'image/png';
    }
    if (body.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';

    throw new UnsupportedMediaTypeException('Formats acceptés: PDF, PNG, JPEG');
  }

  private static storageRef(document: Document): StoredObjectRef {
    return { category: STORAGE_CATEGORIES[document.category], documentId: document.id };
  }

  private static originalFilename(file: Express.Multer.File): string {
    return Buffer.from(file.originalname, 'latin1').toString('utf8');
  }
}
