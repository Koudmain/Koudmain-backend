import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { DocumentsService } from './document.service';
import { DocumentAccessService, DocumentActor } from './document-access.service';
import { ContractGenerationService } from './contract-generation.service';
import { Document, DocumentCategory } from '@/modules/documents/models/document.model';
import { DocumentAssignment } from '@/modules/documents/models/document-assignment.model';
import { DocumentContext } from '@/modules/documents/models/document-context.model';
import { Contract, ContractStatus } from '@/modules/documents/models/contract.model';
import { Invoice } from '@/modules/documents/models/invoice.model';
import { SignatureEnvelope } from '@/modules/documents/models/signature-envelope.model';
import { CreateDocumentDto } from '@/modules/documents/dtos/create-document.dto';
import { S3Service } from '@/modules/s3/services/s3.service';
import { StorageCategory } from '@/modules/s3/s3.types';

jest.mock('@/modules/pdf/services/pdf.service', () => ({ PdfService: class PdfService {} }));

describe('DocumentsService', () => {
  let service: DocumentsService;

  const transaction = { LOCK: { UPDATE: 'UPDATE' } };

  const mockSequelize = {
    query: jest.fn(),
    transaction: jest.fn(),
  };

  const mockS3Service = {
    put: jest.fn(),
    head: jest.fn(),
    deleteVersions: jest.fn(),
    getDownloadUrl: jest.fn(),
    listVersions: jest.fn(),
    buildKey: jest.fn(),
  };

  const mockAccessService = {
    resolveActor: jest.fn(),
    readableDocumentIds: jest.fn(),
    canRead: jest.fn(),
    missionParties: jest.fn(),
    conversationParties: jest.fn(),
    publicationCompanyId: jest.fn(),
  };

  const mockContractGeneration = {
    generateCddu: jest.fn(),
  };

  const mockDocumentModel = { create: jest.fn(), findAll: jest.fn(), findByPk: jest.fn() };
  const mockAssignmentModel = { create: jest.fn(), destroy: jest.fn() };
  const mockContextModel = { create: jest.fn(), destroy: jest.fn() };
  const mockContractModel = {
    create: jest.fn(),
    destroy: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
  };
  const mockInvoiceModel = { create: jest.fn(), destroy: jest.fn() };
  const mockSignatureEnvelopeModel = { destroy: jest.fn() };

  const workerActor: DocumentActor = { userId: 1, workerId: 3, companyIds: [] };
  const employerActor: DocumentActor = { userId: 2, workerId: null, companyIds: [10] };
  const strangerActor: DocumentActor = { userId: 9, workerId: 99, companyIds: [99] };
  const missionParties = { workerId: 3, companyId: 10 };

  const pdf = Buffer.concat([Buffer.from('%PDF-1.7'), Buffer.alloc(8)]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

  const upload = (buffer: Buffer = pdf, originalname = 'rib.pdf') =>
    ({ buffer, originalname, size: buffer.length }) as Express.Multer.File;

  const makeDocument = (overrides: Record<string, unknown> = {}) =>
    ({
      id: 42,
      name: 'Mon RIB',
      category: DocumentCategory.RIB,
      originalFilename: 'rib.pdf',
      mimeType: 'application/pdf',
      assignments: [{ userId: 1, workerId: null, companyId: null }],
      contract: null,
      invoice: null,
      update: jest.fn(),
      destroy: jest.fn(),
      ...overrides,
    }) as unknown as Document;

  const makeContract = (overrides: Record<string, unknown> = {}) =>
    makeDocument({
      name: 'Contrat CDDU - mission 8',
      category: DocumentCategory.CONTRACT,
      assignments: [{ userId: null, workerId: 3, companyId: 10 }],
      contract: { missionId: 8, status: ContractStatus.PENDING, signedAt: null, ...overrides },
    });

  const makeInvoice = (overrides: Record<string, unknown> = {}) =>
    makeDocument({
      name: 'Facture',
      category: DocumentCategory.INVOICE,
      assignments: [{ userId: null, workerId: 3, companyId: 10 }],
      invoice: { missionId: 8, status: 'DRAFT', update: jest.fn(), ...overrides },
    });

  const putResult = (category: StorageCategory = StorageCategory.RIB) => ({
    category,
    documentId: 42,
    key: `${category.toLowerCase()}/42`,
    versionId: 'v1',
    size: pdf.length,
    checksum: 'sha',
    purgedVersions: 0,
  });

  const givenActor = (actor: DocumentActor) =>
    mockAccessService.resolveActor.mockResolvedValue(actor);

  const givenReadable = (document: Document | null) => {
    mockDocumentModel.findByPk.mockResolvedValue(document);
    mockAccessService.canRead.mockResolvedValue(true);
  };

  const createdAssignment = () => mockAssignmentModel.create.mock.calls[0][0];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: Sequelize, useValue: mockSequelize },
        { provide: S3Service, useValue: mockS3Service },
        { provide: DocumentAccessService, useValue: mockAccessService },
        { provide: ContractGenerationService, useValue: mockContractGeneration },
        { provide: getModelToken(Document), useValue: mockDocumentModel },
        { provide: getModelToken(DocumentAssignment), useValue: mockAssignmentModel },
        { provide: getModelToken(DocumentContext), useValue: mockContextModel },
        { provide: getModelToken(Contract), useValue: mockContractModel },
        { provide: getModelToken(Invoice), useValue: mockInvoiceModel },
        { provide: getModelToken(SignatureEnvelope), useValue: mockSignatureEnvelopeModel },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);

    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    mockSequelize.query.mockResolvedValue([[{ id: '42' }]]);
    mockSequelize.transaction.mockImplementation((callback: (t: unknown) => unknown) =>
      callback(transaction),
    );
    mockS3Service.put.mockImplementation(async (ref: { category: StorageCategory }) =>
      putResult(ref.category),
    );
    mockS3Service.head.mockResolvedValue({ sealed: false });
    mockS3Service.deleteVersions.mockResolvedValue({ deletedVersions: 1, errors: [] });
    mockS3Service.buildKey.mockReturnValue('rib/42');
    mockAccessService.readableDocumentIds.mockReturnValue('(SELECT 42)');
    mockAccessService.canRead.mockResolvedValue(true);
    mockAccessService.missionParties.mockResolvedValue(missionParties);
    mockDocumentModel.findByPk.mockResolvedValue(makeDocument());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    const ribDto: CreateDocumentDto = { name: 'Mon RIB', category: DocumentCategory.RIB };

    beforeEach(() => givenActor(workerActor));

    it('doit refuser le dépôt d’un contrat', async () => {
      await expect(
        service.create(1, { name: 'Contrat', category: DocumentCategory.CONTRACT }, upload()),
      ).rejects.toThrow(BadRequestException);
      expect(mockS3Service.put).not.toHaveBeenCalled();
    });

    it('doit stocker le fichier puis enregistrer le document au nom du déposant', async () => {
      const document = makeDocument();
      mockDocumentModel.findByPk.mockResolvedValue(document);

      await expect(service.create(1, ribDto, upload())).resolves.toBe(document);

      expect(mockS3Service.put).toHaveBeenCalledWith(
        { category: StorageCategory.RIB, documentId: 42 },
        pdf,
        'application/pdf',
      );
      expect(mockDocumentModel.create).toHaveBeenCalledWith(
        {
          id: 42,
          name: 'Mon RIB',
          originalFilename: 'rib.pdf',
          filePath: 'rib/42',
          category: DocumentCategory.RIB,
          versionId: 'v1',
          checksumSha256: 'sha',
          sizeBytes: pdf.length,
          mimeType: 'application/pdf',
        },
        { transaction },
      );
      expect(createdAssignment()).toEqual({
        documentId: 42,
        userId: 1,
        workerId: null,
        companyId: null,
        type: DocumentCategory.RIB,
        verified: false,
      });
      expect(mockContextModel.create).not.toHaveBeenCalled();
      expect(mockContractModel.create).not.toHaveBeenCalled();
      expect(mockInvoiceModel.create).not.toHaveBeenCalled();
    });

    it.each([
      ['image/png', png],
      ['image/jpeg', jpeg],
    ])('doit détecter le format %s', async (mimeType, buffer) => {
      await service.create(1, ribDto, upload(buffer));

      expect(mockS3Service.put).toHaveBeenCalledWith(expect.anything(), buffer, mimeType);
    });

    it('doit refuser un format autre que PDF, PNG ou JPEG', async () => {
      await expect(service.create(1, ribDto, upload(Buffer.from('GIF89a')))).rejects.toThrow(
        UnsupportedMediaTypeException,
      );
      expect(mockS3Service.put).not.toHaveBeenCalled();
    });

    it('doit décoder le nom de fichier envoyé en latin1', async () => {
      const latin1Name = Buffer.from('pièce identité.pdf', 'utf8').toString('latin1');

      await service.create(1, ribDto, upload(pdf, latin1Name));

      expect(mockDocumentModel.create.mock.calls[0][0].originalFilename).toBe('pièce identité.pdf');
    });

    it('doit respecter le type d’assignation demandé', async () => {
      await service.create(1, { ...ribDto, assignmentType: 'PROOF_OF_ADDRESS' }, upload());

      expect(createdAssignment().type).toBe('PROOF_OF_ADDRESS');
    });

    it('doit réserver les champs de facturation aux factures', async () => {
      await expect(service.create(1, { ...ribDto, amountHt: 100 }, upload())).rejects.toThrow(
        'Numéro et montants réservés aux factures',
      );
    });

    describe('rattachement', () => {
      it('doit refuser un autre utilisateur', async () => {
        await expect(service.create(1, { ...ribDto, userId: 2 }, upload())).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('doit refuser un autre profil worker', async () => {
        await expect(service.create(1, { ...ribDto, workerId: 4 }, upload())).rejects.toThrow(
          "Ce profil worker n'est pas le vôtre",
        );
      });

      it('doit refuser une entreprise dont on n’est pas membre', async () => {
        await expect(service.create(1, { ...ribDto, companyId: 10 }, upload())).rejects.toThrow(
          "Vous n'êtes pas membre de cette entreprise",
        );
      });

      it('doit rattacher au seul profil worker demandé', async () => {
        await service.create(1, { ...ribDto, workerId: 3 }, upload());

        expect(createdAssignment()).toMatchObject({ userId: null, workerId: 3, companyId: null });
      });

      it('doit rattacher à l’entreprise du membre', async () => {
        givenActor(employerActor);

        await service.create(
          2,
          { ...ribDto, category: DocumentCategory.KBIS, companyId: 10 },
          upload(),
        );

        expect(createdAssignment()).toMatchObject({
          userId: null,
          workerId: null,
          companyId: 10,
          type: DocumentCategory.KBIS,
        });
      });

      it('doit accepter son propre userId', async () => {
        await service.create(1, { ...ribDto, userId: 1 }, upload());

        expect(createdAssignment()).toMatchObject({ userId: 1 });
      });
    });

    describe('contexte', () => {
      it('doit refuser une conversation à laquelle on ne participe pas', async () => {
        mockAccessService.conversationParties.mockResolvedValue({ workerId: 99, companyId: 99 });

        await expect(service.create(1, { ...ribDto, conversationId: 5 }, upload())).rejects.toThrow(
          'Vous ne participez pas à cette conversation',
        );
      });

      it('doit refuser une conversation inexistante', async () => {
        mockAccessService.conversationParties.mockResolvedValue(null);

        await expect(service.create(1, { ...ribDto, conversationId: 5 }, upload())).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('doit enregistrer le contexte de la conversation', async () => {
        mockAccessService.conversationParties.mockResolvedValue(missionParties);

        await service.create(1, { ...ribDto, conversationId: 5 }, upload());

        expect(mockContextModel.create).toHaveBeenCalledWith(
          { documentId: 42, conversationId: 5, missionId: null, publicationId: null },
          { transaction },
        );
      });

      it('doit refuser une publication d’une autre entreprise', async () => {
        givenActor(employerActor);
        mockAccessService.publicationCompanyId.mockResolvedValue(99);

        await expect(service.create(2, { ...ribDto, publicationId: 6 }, upload())).rejects.toThrow(
          "Cette publication n'appartient pas à votre entreprise",
        );
      });

      it('doit refuser une publication inexistante', async () => {
        givenActor(employerActor);
        mockAccessService.publicationCompanyId.mockResolvedValue(null);

        await expect(service.create(2, { ...ribDto, publicationId: 6 }, upload())).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('doit enregistrer le contexte de la publication', async () => {
        givenActor(employerActor);
        mockAccessService.publicationCompanyId.mockResolvedValue(10);

        await service.create(2, { ...ribDto, publicationId: 6 }, upload());

        expect(mockContextModel.create.mock.calls[0][0]).toMatchObject({ publicationId: 6 });
      });

      it('doit refuser une mission à laquelle on ne participe pas', async () => {
        givenActor(strangerActor);

        await expect(service.create(9, { ...ribDto, missionId: 8 }, upload())).rejects.toThrow(
          'Vous ne participez pas à cette mission',
        );
      });

      it('doit refuser une mission inexistante', async () => {
        mockAccessService.missionParties.mockResolvedValue(null);

        await expect(service.create(1, { ...ribDto, missionId: 8 }, upload())).rejects.toThrow(
          ForbiddenException,
        );
      });
    });

    describe('facture', () => {
      const invoiceDto: CreateDocumentDto = {
        name: 'Facture',
        category: DocumentCategory.INVOICE,
        missionId: 8,
      };

      beforeEach(() => givenActor(employerActor));

      it('doit exiger une mission', async () => {
        await expect(
          service.create(2, { ...invoiceDto, missionId: undefined }, upload()),
        ).rejects.toThrow('missionId est obligatoire pour un contrat ou une facture');
      });

      it('doit refuser un rattachement explicite', async () => {
        await expect(service.create(2, { ...invoiceDto, companyId: 10 }, upload())).rejects.toThrow(
          BadRequestException,
        );
      });

      it('doit être déposée par l’entreprise de la mission', async () => {
        givenActor(workerActor);

        await expect(service.create(1, invoiceDto, upload())).rejects.toThrow(
          "Seule l'entreprise de la mission peut déposer ce document",
        );
      });

      it('doit rattacher la facture aux parties de la mission', async () => {
        await service.create(
          2,
          { ...invoiceDto, invoiceNumber: 'F-1', amountHt: 100, amountTtc: 120, feeAmount: 5 },
          upload(),
        );

        expect(createdAssignment()).toEqual({
          documentId: 42,
          userId: null,
          workerId: 3,
          companyId: 10,
          type: DocumentCategory.INVOICE,
          verified: false,
        });
        expect(mockContextModel.create.mock.calls[0][0]).toMatchObject({ missionId: 8 });
        expect(mockInvoiceModel.create).toHaveBeenCalledWith(
          {
            documentId: 42,
            documentCategory: DocumentCategory.INVOICE,
            missionId: 8,
            invoiceNumber: 'F-1',
            amountHt: 100,
            amountTtc: 120,
            feeAmount: 5,
            status: 'DRAFT',
          },
          { transaction },
        );
      });

      it('doit appliquer des valeurs par défaut aux champs de facture', async () => {
        await service.create(2, invoiceDto, upload());

        expect(mockInvoiceModel.create.mock.calls[0][0]).toMatchObject({
          invoiceNumber: expect.stringMatching(/^INV-\d+$/),
          amountHt: 0,
          amountTtc: 0,
          feeAmount: 0,
        });
      });
    });

    describe('échec en base', () => {
      it('doit supprimer le fichier stocké et propager l’erreur', async () => {
        const failure = new Error('violation de contrainte');
        mockDocumentModel.create.mockRejectedValue(failure);

        await expect(service.create(1, ribDto, upload())).rejects.toBe(failure);
        expect(mockS3Service.deleteVersions).toHaveBeenCalledWith({
          category: StorageCategory.RIB,
          documentId: 42,
        });
      });

      it('doit journaliser une suppression incomplète sans masquer l’erreur', async () => {
        const failure = new Error('violation de contrainte');
        mockDocumentModel.create.mockRejectedValue(failure);
        mockS3Service.deleteVersions.mockResolvedValue({
          deletedVersions: 0,
          errors: [{ message: 'AccessDenied' }],
        });

        await expect(service.create(1, ribDto, upload())).rejects.toBe(failure);
        expect(Logger.prototype.error).toHaveBeenCalledWith(
          expect.stringContaining('Suppression incomplète du fichier rib/42: AccessDenied'),
        );
      });

      it('doit journaliser un échec de suppression sans masquer l’erreur', async () => {
        const failure = new Error('violation de contrainte');
        mockDocumentModel.create.mockRejectedValue(failure);
        mockS3Service.deleteVersions.mockRejectedValue(new Error('timeout'));

        await expect(service.create(1, ribDto, upload())).rejects.toBe(failure);
        expect(Logger.prototype.error).toHaveBeenCalledWith(
          'Échec de suppression du fichier rib/42',
          expect.any(Error),
        );
      });
    });
  });

  describe('findAll', () => {
    beforeEach(() => givenActor(workerActor));

    const findAllArgs = () => mockDocumentModel.findAll.mock.calls[0][0];

    it('doit limiter la recherche aux documents lisibles', async () => {
      mockDocumentModel.findAll.mockResolvedValue([]);

      await expect(service.findAll(1)).resolves.toEqual([]);

      const { where, include, order } = findAllArgs();

      expect(mockAccessService.readableDocumentIds).toHaveBeenCalledWith(workerActor);
      expect(where[Op.and]).toHaveLength(1);
      expect(where[Op.and][0].val).toBe('"Document"."id" IN (SELECT 42)');
      expect(include).toHaveLength(5);
      expect(include[0].where).toBeUndefined();
      expect(order).toEqual([['createdAt', 'DESC']]);
    });

    it('doit filtrer par catégorie et par nom', async () => {
      await service.findAll(1, { category: DocumentCategory.RIB, search: 'rib' });

      const conditions = findAllArgs().where[Op.and];

      expect(conditions[1]).toEqual({ category: DocumentCategory.RIB });
      expect(conditions[2]).toEqual({ name: { [Op.iLike]: '%rib%' } });
    });

    it('doit filtrer par rattachement', async () => {
      await service.findAll(1, { workerId: 3, companyId: 10, userId: 1 });

      expect(findAllArgs().include[0]).toMatchObject({
        as: 'assignments',
        where: { workerId: 3, companyId: 10, userId: 1 },
        required: true,
      });
    });

    it('doit filtrer par contexte', async () => {
      await service.findAll(1, { missionId: 8, conversationId: 5, publicationId: 6 });

      expect(findAllArgs().include[1]).toMatchObject({
        as: 'context',
        where: { missionId: 8, conversationId: 5, publicationId: 6 },
        required: true,
      });
    });
  });

  describe('findOne', () => {
    beforeEach(() => givenActor(workerActor));

    it('doit renvoyer un document lisible', async () => {
      const document = makeDocument();
      givenReadable(document);

      await expect(service.findOne(1, 42)).resolves.toBe(document);
      expect(mockAccessService.canRead).toHaveBeenCalledWith(workerActor, 42, undefined);
    });

    it('doit lever NotFoundException si le document n’existe pas', async () => {
      givenReadable(null);

      await expect(service.findOne(1, 42)).rejects.toThrow('Document #42 introuvable');
    });

    it('doit lever NotFoundException si le document n’est pas lisible', async () => {
      mockAccessService.canRead.mockResolvedValue(false);

      await expect(service.findOne(1, 42)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('doit renommer un document personnel', async () => {
      const document = makeDocument();
      givenActor(workerActor);
      givenReadable(document);

      await expect(service.update(1, 42, { name: 'RIB perso' })).resolves.toBe(document);
      expect(document.update).toHaveBeenCalledWith({ name: 'RIB perso' }, { transaction });
    });

    it('ne doit rien modifier sans champ', async () => {
      const document = makeDocument();
      givenActor(workerActor);
      givenReadable(document);

      await service.update(1, 42, {});

      expect(document.update).not.toHaveBeenCalled();
    });

    it.each([
      ['son profil worker', { userId: null, workerId: 3, companyId: null }, workerActor],
      ['son entreprise', { userId: null, workerId: null, companyId: 10 }, employerActor],
    ])('doit reconnaître le propriétaire via %s', async (label, assignment, actor) => {
      const document = makeDocument({ assignments: [assignment] });
      givenActor(actor);
      givenReadable(document);

      await service.update(actor.userId, 42, { name: 'Renommé' });

      expect(document.update).toHaveBeenCalled();
    });

    it('doit refuser un lecteur qui n’est pas propriétaire', async () => {
      givenActor(strangerActor);
      givenReadable(makeDocument());

      await expect(service.update(9, 42, { name: 'x' })).rejects.toThrow(
        "Vous n'êtes pas propriétaire de ce document",
      );
    });

    it('doit réserver les montants aux factures', async () => {
      givenActor(workerActor);
      givenReadable(makeDocument());

      await expect(service.update(1, 42, { amountHt: 10 })).rejects.toThrow(
        'Les montants ne concernent que les factures',
      );
    });

    it('doit modifier les montants d’une facture en brouillon', async () => {
      const document = makeInvoice();
      givenActor(employerActor);
      givenReadable(document);

      await service.update(2, 42, { amountHt: 100, amountTtc: 120, feeAmount: 5 });

      expect(mockAccessService.missionParties).toHaveBeenCalledWith(8, transaction);
      expect(document.invoice.update).toHaveBeenCalledWith(
        { amountHt: 100, amountTtc: 120, feeAmount: 5 },
        { transaction },
      );
    });

    it('doit réserver la modification d’une facture à l’entreprise', async () => {
      givenActor(workerActor);
      givenReadable(makeInvoice());

      await expect(service.update(1, 42, { name: 'x' })).rejects.toThrow(
        "Seule l'entreprise de la mission peut modifier ce document",
      );
    });

    it('doit refuser si la mission n’existe plus', async () => {
      givenActor(employerActor);
      givenReadable(makeInvoice());
      mockAccessService.missionParties.mockResolvedValue(null);

      await expect(service.update(2, 42, { name: 'x' })).rejects.toThrow(ForbiddenException);
    });

    it('doit refuser de modifier une facture émise', async () => {
      givenActor(employerActor);
      givenReadable(makeInvoice({ status: 'SENT' }));

      await expect(service.update(2, 42, { amountHt: 1 })).rejects.toThrow(
        'Cette facture est émise: elle ne peut plus être modifiée ni supprimée',
      );
    });

    it('doit considérer une facture sans statut comme brouillon', async () => {
      const document = makeInvoice({ status: null });
      givenActor(employerActor);
      givenReadable(document);

      await service.update(2, 42, { name: 'x' });

      expect(document.update).toHaveBeenCalled();
    });

    it.each([
      [{ status: ContractStatus.AWAITING_SIGNATURE }, 'en cours de signature'],
      [{ status: ContractStatus.SIGNED }, 'est signé'],
      [{ signedAt: new Date() }, 'est signé'],
    ])('doit refuser de modifier un contrat verrouillé (%p)', async (contract, reason) => {
      givenActor(employerActor);
      givenReadable(makeContract(contract));

      await expect(service.update(2, 42, { name: 'x' })).rejects.toThrow(reason);
    });

    it('doit considérer un contrat sans statut comme brouillon', async () => {
      const document = makeContract({ status: null });
      givenActor(employerActor);
      givenReadable(document);

      await service.update(2, 42, { name: 'x' });

      expect(document.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('doit supprimer le document, ses associations puis son fichier', async () => {
      const document = makeDocument();
      givenActor(workerActor);
      givenReadable(document);

      await expect(service.delete(1, 42)).resolves.toEqual({
        message: 'Document supprimé avec succès',
        id: 42,
      });

      for (const model of [
        mockAssignmentModel,
        mockContextModel,
        mockContractModel,
        mockInvoiceModel,
        mockSignatureEnvelopeModel,
      ]) {
        expect(model.destroy).toHaveBeenCalledWith({ where: { documentId: 42 }, transaction });
      }
      expect(document.destroy).toHaveBeenCalledWith({ transaction });
      expect(mockS3Service.head).toHaveBeenCalledWith({
        category: StorageCategory.RIB,
        documentId: 42,
      });
      expect(mockS3Service.deleteVersions).toHaveBeenCalledWith({
        category: StorageCategory.RIB,
        documentId: 42,
      });
    });

    it('doit refuser de supprimer un fichier scellé', async () => {
      const document = makeContract({ status: null });
      givenActor(employerActor);
      givenReadable(document);
      mockS3Service.head.mockResolvedValue({
        sealed: true,
        retainUntil: new Date('2036-01-01T00:00:00Z'),
      });

      await expect(service.delete(2, 42)).rejects.toThrow(ConflictException);
      expect(document.destroy).not.toHaveBeenCalled();
      expect(mockS3Service.deleteVersions).not.toHaveBeenCalled();
    });

    it('doit supprimer le document même si son fichier a disparu', async () => {
      const document = makeDocument();
      givenActor(workerActor);
      givenReadable(document);
      mockS3Service.head.mockRejectedValue(new NotFoundException());

      await service.delete(1, 42);

      expect(document.destroy).toHaveBeenCalled();
    });

    it('doit propager une erreur S3 inattendue', async () => {
      const failure = new Error('AccessDenied');
      const document = makeDocument();
      givenActor(workerActor);
      givenReadable(document);
      mockS3Service.head.mockRejectedValue(failure);

      await expect(service.delete(1, 42)).rejects.toBe(failure);
      expect(document.destroy).not.toHaveBeenCalled();
    });

    it('doit permettre au worker de supprimer un contrat brouillon', async () => {
      const document = makeContract();
      givenActor(workerActor);
      givenReadable(document);

      await service.delete(1, 42);

      expect(document.destroy).toHaveBeenCalled();
      expect(mockS3Service.deleteVersions).toHaveBeenCalledWith({
        category: StorageCategory.CONTRACT,
        documentId: 42,
      });
    });

    it('doit refuser la suppression à un tiers', async () => {
      givenActor(strangerActor);
      givenReadable(makeContract());

      await expect(service.delete(9, 42)).rejects.toThrow(
        'Seules les parties de la mission peuvent supprimer ce document',
      );
    });

    it('doit refuser de supprimer un contrat signé', async () => {
      givenActor(employerActor);
      givenReadable(makeContract({ status: ContractStatus.SIGNED }));

      await expect(service.delete(2, 42)).rejects.toThrow(ConflictException);
      expect(mockS3Service.deleteVersions).not.toHaveBeenCalled();
    });
  });

  describe('replaceFile', () => {
    it('doit remplacer le fichier et ses métadonnées', async () => {
      const document = makeDocument();
      givenActor(workerActor);
      givenReadable(document);

      await expect(service.replaceFile(1, 42, upload(png, 'rib.png'))).resolves.toBe(document);

      expect(mockS3Service.put).toHaveBeenCalledWith(
        { category: StorageCategory.RIB, documentId: 42 },
        png,
        'image/png',
      );
      expect(document.update).toHaveBeenCalledWith(
        {
          originalFilename: 'rib.png',
          sizeBytes: png.length,
          mimeType: 'image/png',
          versionId: 'v1',
          checksumSha256: 'sha',
        },
        { transaction },
      );
    });

    it('doit refuser de remplacer le fichier d’un contrat', async () => {
      givenActor(employerActor);
      givenReadable(makeContract());

      await expect(service.replaceFile(2, 42, upload())).rejects.toThrow(BadRequestException);
      expect(mockS3Service.put).not.toHaveBeenCalled();
    });

    it('doit refuser un format non accepté', async () => {
      givenActor(workerActor);

      await expect(service.replaceFile(1, 42, upload(Buffer.from('texte')))).rejects.toThrow(
        UnsupportedMediaTypeException,
      );
    });

    it('doit refuser un lecteur qui n’est pas propriétaire', async () => {
      givenActor(strangerActor);
      givenReadable(makeDocument());

      await expect(service.replaceFile(9, 42, upload())).rejects.toThrow(ForbiddenException);
      expect(mockS3Service.put).not.toHaveBeenCalled();
    });
  });

  describe('generateContract', () => {
    const generated = Buffer.from('%PDF-contrat');

    beforeEach(() => {
      givenActor(employerActor);
      mockContractGeneration.generateCddu.mockResolvedValue(generated);
      mockContractModel.findOne.mockResolvedValue(null);
    });

    it('doit cacher une mission inexistante', async () => {
      mockAccessService.missionParties.mockResolvedValue(null);

      await expect(service.generateContract(2, 8)).rejects.toThrow('Mission #8 introuvable');
    });

    it('doit cacher la mission à un tiers', async () => {
      givenActor(strangerActor);

      await expect(service.generateContract(9, 8)).rejects.toThrow(NotFoundException);
    });

    it('doit réserver la génération à l’entreprise', async () => {
      givenActor(workerActor);

      await expect(service.generateContract(1, 8)).rejects.toThrow(
        "Seule l'entreprise de la mission peut générer son contrat",
      );
      expect(mockContractGeneration.generateCddu).not.toHaveBeenCalled();
    });

    it('doit générer, stocker et enregistrer un nouveau contrat', async () => {
      const document = makeContract();
      mockDocumentModel.findByPk.mockResolvedValue(document);

      await expect(service.generateContract(2, 8)).resolves.toBe(document);

      expect(mockContractGeneration.generateCddu).toHaveBeenCalledWith(8, 2, 42);
      expect(mockS3Service.put).toHaveBeenCalledWith(
        { category: StorageCategory.CONTRACT, documentId: 42 },
        generated,
        'application/pdf',
      );
      expect(mockDocumentModel.create.mock.calls[0][0]).toMatchObject({
        id: 42,
        name: 'Contrat CDDU - mission 8',
        originalFilename: 'contrat-cddu-42.pdf',
        category: DocumentCategory.CONTRACT,
        sizeBytes: generated.length,
        mimeType: 'application/pdf',
      });
      expect(createdAssignment()).toMatchObject({ userId: null, workerId: 3, companyId: 10 });
      expect(mockContextModel.create.mock.calls[0][0]).toMatchObject({ missionId: 8 });
      expect(mockContractModel.create).toHaveBeenCalledWith(
        {
          documentId: 42,
          documentCategory: DocumentCategory.CONTRACT,
          missionId: 8,
          status: ContractStatus.PENDING,
        },
        { transaction },
      );
    });

    it('doit supprimer le PDF stocké si l’enregistrement échoue', async () => {
      const failure = new Error('violation de contrainte');
      mockContractModel.create.mockRejectedValue(failure);

      await expect(service.generateContract(2, 8)).rejects.toBe(failure);
      expect(mockS3Service.deleteVersions).toHaveBeenCalledWith({
        category: StorageCategory.CONTRACT,
        documentId: 42,
      });
    });

    it('doit régénérer le brouillon existant en nouvelle version', async () => {
      const document = makeContract();
      mockContractModel.findOne.mockResolvedValue({ documentId: 42 });
      mockDocumentModel.findByPk.mockResolvedValue(document);

      await expect(service.generateContract(2, 8)).resolves.toBe(document);

      expect(mockContractModel.findByPk).toHaveBeenCalledWith(42, {
        transaction,
        lock: 'UPDATE',
      });
      expect(mockSequelize.query).not.toHaveBeenCalled();
      expect(mockContractGeneration.generateCddu).toHaveBeenCalledWith(8, 2, 42);
      expect(mockS3Service.put).toHaveBeenCalledWith(
        { category: StorageCategory.CONTRACT, documentId: 42 },
        generated,
        'application/pdf',
      );
      expect(document.update).toHaveBeenCalledWith(
        {
          sizeBytes: generated.length,
          mimeType: 'application/pdf',
          versionId: 'v1',
          checksumSha256: 'sha',
        },
        { transaction },
      );
      expect(mockDocumentModel.create).not.toHaveBeenCalled();
    });

    it('doit refuser de régénérer un contrat en signature', async () => {
      mockContractModel.findOne.mockResolvedValue({ documentId: 42 });
      mockDocumentModel.findByPk.mockResolvedValue(
        makeContract({ status: ContractStatus.AWAITING_SIGNATURE }),
      );

      await expect(service.generateContract(2, 8)).rejects.toThrow(ConflictException);
      expect(mockContractGeneration.generateCddu).not.toHaveBeenCalled();
      expect(mockS3Service.put).not.toHaveBeenCalled();
    });
  });

  describe('getDownloadUrl', () => {
    beforeEach(() => {
      givenActor(workerActor);
      mockS3Service.getDownloadUrl.mockResolvedValue('https://s3.example/signed');
    });

    it('doit renvoyer une URL signée valable 15 minutes', async () => {
      givenReadable(makeDocument());

      await expect(
        service.getDownloadUrl(1, 42, { inline: true, versionId: 'v1' }),
      ).resolves.toEqual({ url: 'https://s3.example/signed', expiresIn: 900 });
      expect(mockS3Service.getDownloadUrl).toHaveBeenCalledWith(
        { category: StorageCategory.RIB, documentId: 42 },
        { filename: 'rib.pdf', inline: true, versionId: 'v1', expiresIn: 900 },
      );
    });

    it('doit nommer le fichier d’après le document à défaut de nom d’origine', async () => {
      givenReadable(makeDocument({ originalFilename: null }));

      await service.getDownloadUrl(1, 42);

      expect(mockS3Service.getDownloadUrl.mock.calls[0][1].filename).toBe('Mon RIB');
    });

    it('ne doit rien signer pour un document illisible', async () => {
      mockAccessService.canRead.mockResolvedValue(false);

      await expect(service.getDownloadUrl(1, 42)).rejects.toThrow(NotFoundException);
      expect(mockS3Service.getDownloadUrl).not.toHaveBeenCalled();
    });
  });

  describe('listFileVersions', () => {
    it('doit lister les versions du fichier du document', async () => {
      const versions = [{ versionId: 'v2', isLatest: true, size: 10 }];
      givenActor(employerActor);
      givenReadable(makeContract());
      mockS3Service.listVersions.mockResolvedValue(versions);

      await expect(service.listFileVersions(2, 42)).resolves.toBe(versions);
      expect(mockS3Service.listVersions).toHaveBeenCalledWith({
        category: StorageCategory.CONTRACT,
        documentId: 42,
      });
    });
  });
});
