import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { createHash } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DocumentSignatureService } from './document-signature.service';
import { DocumentsService } from './document.service';
import { DocumentAccessService, DocumentActor } from './document-access.service';
import { Document, DocumentCategory } from '@/modules/documents/models/document.model';
import { Contract, ContractStatus } from '@/modules/documents/models/contract.model';
import {
  SignatureEnvelope,
  SignatureProvider,
  SignatureStatus,
} from '@/modules/documents/models/signature-envelope.model';
import { DocumensoService } from '@/modules/documenso/services/documenso.service';
import {
  DocumensoWebhookEvent,
  DocumensoWebhookPayload,
} from '@/modules/documenso/documenso.types';
import { S3Service } from '@/modules/s3/services/s3.service';
import { StorageCategory } from '@/modules/s3/s3.types';
import { User } from '@/modules/users/models/user.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';

jest.mock('@/modules/pdf/services/pdf.service', () => ({ PdfService: class PdfService {} }));

describe('DocumentSignatureService', () => {
  let service: DocumentSignatureService;

  const transaction = {};

  const mockSequelize = {
    transaction: jest.fn(),
  };

  const mockWorkerProfileModel = { findByPk: jest.fn() };
  const mockUserModel = { findByPk: jest.fn() };

  const mockDocumentsService = { findOne: jest.fn() };

  const mockAccessService = {
    resolveActor: jest.fn(),
    missionParties: jest.fn(),
  };

  const mockDocumensoService = {
    createEnvelope: jest.fn(),
    distribute: jest.fn(),
    getEnvelope: jest.fn(),
    downloadSigned: jest.fn(),
    updateSigner: jest.fn(),
    deleteEnvelope: jest.fn(),
    signingUrl: jest.fn(),
  };

  const mockS3Service = {
    getBytes: jest.fn(),
    seal: jest.fn(),
  };

  const mockDocumentModel = { findByPk: jest.fn(), update: jest.fn() };
  const mockContractModel = { update: jest.fn() };
  const mockSignatureEnvelopeModel = {
    destroy: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const workerActor: DocumentActor = { userId: 1, workerId: 3, companyIds: [] };
  const employerActor: DocumentActor = { userId: 2, workerId: null, companyIds: [10] };
  const strangerActor: DocumentActor = { userId: 9, workerId: 99, companyIds: [99] };
  const contractRef = { category: StorageCategory.CONTRACT, documentId: 42 };
  const pdf = Buffer.from('%PDF-1.7 contrat');
  const signedPdf = Buffer.from('%PDF-1.7 contrat signé');

  const workerSigner = { email: 'alex@koudmain.fr', name: 'Alex Martin' };
  const employerSigner = { email: 'sam@koudmain.fr', name: 'Sam Durand' };

  const makeContract = (overrides: Record<string, unknown> = {}) =>
    ({
      id: 42,
      name: 'Contrat CDDU - mission 8',
      category: DocumentCategory.CONTRACT,
      originalFilename: 'contrat-cddu-42.pdf',
      mimeType: 'application/pdf',
      contract: {
        missionId: 8,
        status: ContractStatus.AWAITING_SIGNATURE,
        workerSignatureId: '11',
        employerSignatureId: '12',
      },
      signatureEnvelope: { externalDocumentId: 'env-1', status: SignatureStatus.PENDING },
      ...overrides,
    }) as unknown as Document;

  const makeEnvelope = (status: SignatureStatus = SignatureStatus.PENDING) =>
    ({
      id: 5,
      documentId: 42,
      externalDocumentId: 'env-1',
      status,
      update: jest.fn(),
    }) as unknown as SignatureEnvelope & { update: jest.Mock };

  const remoteEnvelope = (overrides: Record<string, unknown> = {}) => ({
    id: 'env-1',
    externalId: '42',
    status: 'PENDING',
    completedAt: null,
    recipients: [
      { id: 11, ...workerSigner, token: 'tok-worker', signingStatus: 'NOT_SIGNED', signedAt: null },
      {
        id: 12,
        ...employerSigner,
        token: 'tok-employer',
        signingStatus: 'NOT_SIGNED',
        signedAt: null,
      },
    ],
    envelopeItems: [
      { id: 'item-2', order: 2 },
      { id: 'item-1', order: 1 },
    ],
    ...overrides,
  });

  const givenSigners = (worker = workerSigner, employer = employerSigner) => {
    const user = ({ email, name }: { email: string; name: string }) => {
      const [firstName, lastName] = name.split(' ');

      return { email, first_name: firstName, last_name: lastName };
    };

    mockWorkerProfileModel.findByPk.mockResolvedValue({ user: user(worker) });
    mockUserModel.findByPk.mockResolvedValue(user(employer));
  };

  const webhook = (event: string, envelopeId = 'env-1'): DocumensoWebhookPayload => ({
    event,
    payload: { envelopeId, externalId: '42', status: 'PENDING' },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentSignatureService,
        { provide: Sequelize, useValue: mockSequelize },
        { provide: DocumentsService, useValue: mockDocumentsService },
        { provide: DocumentAccessService, useValue: mockAccessService },
        { provide: DocumensoService, useValue: mockDocumensoService },
        { provide: S3Service, useValue: mockS3Service },
        { provide: getModelToken(Document), useValue: mockDocumentModel },
        { provide: getModelToken(Contract), useValue: mockContractModel },
        { provide: getModelToken(SignatureEnvelope), useValue: mockSignatureEnvelopeModel },
        { provide: getModelToken(WorkerProfile), useValue: mockWorkerProfileModel },
        { provide: getModelToken(User), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<DocumentSignatureService>(DocumentSignatureService);

    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    mockSequelize.transaction.mockImplementation((callback: (t: unknown) => unknown) =>
      callback(transaction),
    );
    mockAccessService.missionParties.mockResolvedValue({ workerId: 3, companyId: 10 });
    mockDocumensoService.signingUrl.mockImplementation(
      (token: string) => `https://sign.koudmain.fr/sign/${token}`,
    );
    givenSigners();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('requestSignature', () => {
    const draft = () =>
      makeContract({
        contract: { missionId: 8, status: ContractStatus.PENDING },
        signatureEnvelope: null,
      });

    beforeEach(() => {
      mockAccessService.resolveActor.mockResolvedValue(employerActor);
      mockDocumentsService.findOne.mockResolvedValue(draft());
      mockContractModel.update.mockResolvedValue([1]);
      mockDocumentModel.findByPk.mockResolvedValue({ versionId: 'v3' });
      mockS3Service.getBytes.mockResolvedValue({ body: pdf });
      mockDocumensoService.createEnvelope.mockResolvedValue('env-1');
      mockDocumensoService.distribute.mockResolvedValue({
        envelopeId: 'env-1',
        recipients: [
          { id: 11, email: 'ALEX@koudmain.fr', token: 'tok-worker' },
          { id: 12, email: 'sam@koudmain.fr', token: 'tok-employer' },
        ],
      });
    });

    it('doit envoyer la version courante en signature et renvoyer le lien de l’entreprise', async () => {
      await expect(service.requestSignature(2, 42)).resolves.toEqual({
        url: 'https://sign.koudmain.fr/sign/tok-employer',
      });

      expect(mockContractModel.update).toHaveBeenNthCalledWith(
        1,
        { status: ContractStatus.AWAITING_SIGNATURE },
        {
          where: {
            documentId: 42,
            signedAt: null,
            status: { [Op.or]: [ContractStatus.PENDING, null] },
          },
        },
      );
      expect(mockS3Service.getBytes).toHaveBeenCalledWith(contractRef, 'v3');
      expect(mockDocumensoService.createEnvelope).toHaveBeenCalledWith({
        title: 'Contrat CDDU - mission 8',
        externalId: '42',
        pdf,
        filename: 'contrat-cddu-42.pdf',
        signers: [workerSigner, employerSigner],
      });
      expect(mockDocumensoService.distribute).toHaveBeenCalledWith('env-1');
      expect(mockSignatureEnvelopeModel.destroy).toHaveBeenCalledWith({
        where: { documentId: 42 },
        transaction,
      });
      expect(mockSignatureEnvelopeModel.create).toHaveBeenCalledWith(
        {
          documentId: 42,
          provider: SignatureProvider.DOCUMENSO,
          externalDocumentId: 'env-1',
          status: SignatureStatus.PENDING,
        },
        { transaction },
      );
      expect(mockContractModel.update).toHaveBeenNthCalledWith(
        2,
        { workerSignatureId: '11', employerSignatureId: '12' },
        { where: { documentId: 42 }, transaction },
      );
    });

    it('doit nommer le PDF d’après l’identifiant à défaut de nom d’origine', async () => {
      mockDocumentsService.findOne.mockResolvedValue(
        makeContract({
          originalFilename: null,
          contract: { missionId: 8, status: ContractStatus.PENDING },
        }),
      );

      await service.requestSignature(2, 42);

      expect(mockDocumensoService.createEnvelope.mock.calls[0][0].filename).toBe('contrat-42.pdf');
    });

    it('doit réserver l’envoi à l’entreprise de la mission', async () => {
      mockAccessService.resolveActor.mockResolvedValue(workerActor);

      await expect(service.requestSignature(1, 42)).rejects.toThrow(ForbiddenException);
      expect(mockContractModel.update).not.toHaveBeenCalled();
    });

    it('doit refuser un document qui n’est pas un contrat', async () => {
      mockDocumentsService.findOne.mockResolvedValue(makeContract({ contract: null }));

      await expect(service.requestSignature(2, 42)).rejects.toThrow(
        'Seul un contrat peut être signé',
      );
    });

    it.each([null, { workerId: null, companyId: 10 }])(
      'doit refuser un contrat sans mission ou sans worker (%p)',
      async (parties) => {
        mockAccessService.missionParties.mockResolvedValue(parties);

        await expect(service.requestSignature(2, 42)).rejects.toThrow(NotFoundException);
      },
    );

    it('doit refuser un contrat qui n’est pas un PDF', async () => {
      mockDocumentsService.findOne.mockResolvedValue(
        makeContract({ mimeType: 'image/png', contract: { missionId: 8 } }),
      );

      await expect(service.requestSignature(2, 42)).rejects.toThrow(
        'Seul un contrat au format PDF peut être signé',
      );
    });

    it('doit exiger deux e-mails de signataires différents', async () => {
      givenSigners(workerSigner, { ...employerSigner, email: 'ALEX@koudmain.fr' });

      await expect(service.requestSignature(2, 42)).rejects.toThrow(BadRequestException);
      expect(mockContractModel.update).not.toHaveBeenCalled();
    });

    it('doit lever NotFoundException si un signataire est introuvable', async () => {
      mockWorkerProfileModel.findByPk.mockResolvedValue(null);

      await expect(service.requestSignature(2, 42)).rejects.toThrow('Signataire introuvable');
    });

    it('doit refuser un contrat qui n’est plus un brouillon', async () => {
      mockContractModel.update.mockResolvedValue([0]);

      await expect(service.requestSignature(2, 42)).rejects.toThrow(ConflictException);
      expect(mockContractModel.update).toHaveBeenCalledTimes(1);
      expect(mockDocumensoService.createEnvelope).not.toHaveBeenCalled();
    });

    it('doit remettre le contrat en brouillon si Documenso refuse l’enveloppe', async () => {
      const failure = new BadRequestException('Documenso a refusé');
      mockDocumensoService.createEnvelope.mockRejectedValue(failure);

      await expect(service.requestSignature(2, 42)).rejects.toBe(failure);
      expect(mockContractModel.update).toHaveBeenLastCalledWith(
        { status: ContractStatus.PENDING },
        { where: { documentId: 42, status: ContractStatus.AWAITING_SIGNATURE } },
      );
      expect(mockDocumensoService.deleteEnvelope).not.toHaveBeenCalled();
    });

    it('doit supprimer l’enveloppe créée si la distribution échoue', async () => {
      const failure = new Error('distribution');
      mockDocumensoService.distribute.mockRejectedValue(failure);

      await expect(service.requestSignature(2, 42)).rejects.toBe(failure);
      expect(mockDocumensoService.deleteEnvelope).toHaveBeenCalledWith('env-1');
      expect(mockSignatureEnvelopeModel.create).not.toHaveBeenCalled();
    });

    it('doit refuser une distribution sans les deux signataires', async () => {
      mockDocumensoService.distribute.mockResolvedValue({
        envelopeId: 'env-1',
        recipients: [{ id: 11, email: 'alex@koudmain.fr', token: 'tok-worker' }],
      });

      await expect(service.requestSignature(2, 42)).rejects.toThrow(ConflictException);
      expect(mockDocumensoService.deleteEnvelope).toHaveBeenCalledWith('env-1');
    });

    it('doit journaliser l’échec de suppression de l’enveloppe sans masquer l’erreur', async () => {
      const failure = new Error('distribution');
      mockDocumensoService.distribute.mockRejectedValue(failure);
      mockDocumensoService.deleteEnvelope.mockRejectedValue(new Error('Documenso injoignable'));

      await expect(service.requestSignature(2, 42)).rejects.toBe(failure);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Enveloppe Documenso env-1 non supprimée',
        expect.any(Error),
      );
    });
  });

  describe('getSigningLink', () => {
    beforeEach(() => {
      mockDocumentsService.findOne.mockResolvedValue(makeContract());
      mockDocumensoService.getEnvelope.mockResolvedValue(remoteEnvelope());
    });

    it('doit renvoyer le lien du worker', async () => {
      mockAccessService.resolveActor.mockResolvedValue(workerActor);

      await expect(service.getSigningLink(1, 42)).resolves.toEqual({
        url: 'https://sign.koudmain.fr/sign/tok-worker',
      });
      expect(mockDocumensoService.getEnvelope).toHaveBeenCalledWith('env-1');
      expect(mockDocumensoService.updateSigner).not.toHaveBeenCalled();
    });

    it('doit renvoyer le lien de l’entreprise sans réattribution au même signataire', async () => {
      mockAccessService.resolveActor.mockResolvedValue(employerActor);
      givenSigners(workerSigner, { ...employerSigner, email: 'SAM@koudmain.fr' });

      await expect(service.getSigningLink(2, 42)).resolves.toEqual({
        url: 'https://sign.koudmain.fr/sign/tok-employer',
      });
      expect(mockDocumensoService.updateSigner).not.toHaveBeenCalled();
    });

    it('doit réattribuer la signature entreprise au membre qui demande le lien', async () => {
      const colleague = { email: 'lou@koudmain.fr', name: 'Lou Bernard' };
      mockAccessService.resolveActor.mockResolvedValue({ ...employerActor, userId: 7 });
      givenSigners(workerSigner, colleague);

      await service.getSigningLink(7, 42);

      expect(mockDocumensoService.updateSigner).toHaveBeenCalledWith('env-1', 12, colleague);
    });

    it('doit passer au côté entreprise si le côté worker a déjà signé', async () => {
      mockAccessService.resolveActor.mockResolvedValue({
        userId: 2,
        workerId: 3,
        companyIds: [10],
      });
      const remote = remoteEnvelope();
      remote.recipients[0].signingStatus = 'SIGNED';
      mockDocumensoService.getEnvelope.mockResolvedValue(remote);

      await expect(service.getSigningLink(2, 42)).resolves.toEqual({
        url: 'https://sign.koudmain.fr/sign/tok-employer',
      });
    });

    it('doit signaler un contrat déjà signé de son côté', async () => {
      mockAccessService.resolveActor.mockResolvedValue(workerActor);
      const remote = remoteEnvelope();
      remote.recipients[0].signingStatus = 'SIGNED';
      mockDocumensoService.getEnvelope.mockResolvedValue(remote);

      await expect(service.getSigningLink(1, 42)).rejects.toThrow(
        'Ce contrat a déjà été signé de votre côté',
      );
    });

    it.each([
      ['sans enveloppe', null],
      ['complète', { externalDocumentId: 'env-1', status: SignatureStatus.COMPLETED }],
      ['refusée', { externalDocumentId: 'env-1', status: SignatureStatus.DECLINED }],
    ])('doit refuser un contrat %s', async (label, signatureEnvelope) => {
      mockAccessService.resolveActor.mockResolvedValue(workerActor);
      mockDocumentsService.findOne.mockResolvedValue(makeContract({ signatureEnvelope }));

      await expect(service.getSigningLink(1, 42)).rejects.toThrow(
        "Ce contrat n'est pas en attente de signature",
      );
      expect(mockDocumensoService.getEnvelope).not.toHaveBeenCalled();
    });

    it('doit accepter une enveloppe partiellement signée', async () => {
      mockAccessService.resolveActor.mockResolvedValue(workerActor);
      mockDocumentsService.findOne.mockResolvedValue(
        makeContract({
          signatureEnvelope: {
            externalDocumentId: 'env-1',
            status: SignatureStatus.PARTIALLY_SIGNED,
          },
        }),
      );

      await expect(service.getSigningLink(1, 42)).resolves.toHaveProperty('url');
    });

    it('doit refuser un tiers', async () => {
      mockAccessService.resolveActor.mockResolvedValue(strangerActor);

      await expect(service.getSigningLink(9, 42)).rejects.toThrow(ForbiddenException);
    });

    it('doit lever NotFoundException si le signataire a disparu de Documenso', async () => {
      mockAccessService.resolveActor.mockResolvedValue(workerActor);
      mockDocumensoService.getEnvelope.mockResolvedValue(remoteEnvelope({ recipients: [] }));

      await expect(service.getSigningLink(1, 42)).rejects.toThrow(
        'Signataire introuvable dans Documenso',
      );
    });
  });

  describe('handleWebhook', () => {
    it.each([
      ['sans payload', { event: 'DOCUMENT_COMPLETED' }],
      ['sans envelopeId', webhook(DocumensoWebhookEvent.DOCUMENT_COMPLETED, '')],
      ['vide', undefined],
    ])('doit refuser un webhook %s', async (label, payload) => {
      await expect(
        service.handleWebhook(payload as unknown as DocumensoWebhookPayload),
      ).rejects.toThrow('Webhook Documenso sans envelopeId');
    });

    it('doit ignorer une enveloppe inconnue', async () => {
      mockSignatureEnvelopeModel.findOne.mockResolvedValue(null);

      await expect(
        service.handleWebhook(webhook(DocumensoWebhookEvent.DOCUMENT_COMPLETED, 'env-x')),
      ).resolves.toBeUndefined();
      expect(mockSignatureEnvelopeModel.findOne).toHaveBeenCalledWith({
        where: { externalDocumentId: 'env-x' },
      });
      expect(Logger.prototype.warn).toHaveBeenCalled();
      expect(mockDocumensoService.getEnvelope).not.toHaveBeenCalled();
    });

    it.each([
      DocumensoWebhookEvent.DOCUMENT_SIGNED,
      DocumensoWebhookEvent.DOCUMENT_RECIPIENT_COMPLETED,
    ])('doit marquer l’enveloppe partiellement signée sur %s', async (event) => {
      mockSignatureEnvelopeModel.findOne.mockResolvedValue(makeEnvelope());

      await service.handleWebhook(webhook(event));

      expect(mockSignatureEnvelopeModel.update).toHaveBeenCalledWith(
        { status: SignatureStatus.PARTIALLY_SIGNED },
        { where: { id: 5, status: SignatureStatus.PENDING } },
      );
    });

    it('doit ignorer un événement non géré', async () => {
      const envelope = makeEnvelope();
      mockSignatureEnvelopeModel.findOne.mockResolvedValue(envelope);

      await service.handleWebhook(webhook('DOCUMENT_OPENED'));

      expect(mockSignatureEnvelopeModel.update).not.toHaveBeenCalled();
      expect(envelope.update).not.toHaveBeenCalled();
    });

    describe('DOCUMENT_COMPLETED', () => {
      const completed = webhook(DocumensoWebhookEvent.DOCUMENT_COMPLETED);

      beforeEach(() => {
        mockDocumensoService.getEnvelope.mockResolvedValue(
          remoteEnvelope({ status: 'COMPLETED', completedAt: '2026-10-15T10:00:00.000Z' }),
        );
        mockDocumensoService.downloadSigned.mockResolvedValue(signedPdf);
        mockS3Service.seal.mockResolvedValue({ versionId: 'v-sealed', checksum: 'sha-sealed' });
      });

      it('doit sceller le PDF signé et marquer le contrat SIGNED', async () => {
        const envelope = makeEnvelope(SignatureStatus.PARTIALLY_SIGNED);
        mockSignatureEnvelopeModel.findOne.mockResolvedValue(envelope);

        await service.handleWebhook(completed);

        expect(mockDocumensoService.downloadSigned).toHaveBeenCalledWith('item-1');
        expect(mockS3Service.seal).toHaveBeenCalledWith(contractRef, signedPdf);
        expect(mockDocumentModel.update).toHaveBeenCalledWith(
          {
            versionId: 'v-sealed',
            checksumSha256: 'sha-sealed',
            sizeBytes: signedPdf.length,
            mimeType: 'application/pdf',
          },
          { where: { id: 42 }, transaction },
        );
        expect(mockContractModel.update).toHaveBeenCalledWith(
          { status: ContractStatus.SIGNED, signedAt: new Date('2026-10-15T10:00:00.000Z') },
          { where: { documentId: 42 }, transaction },
        );
        expect(envelope.update).toHaveBeenCalledWith(
          { status: SignatureStatus.COMPLETED },
          { transaction },
        );
      });

      it('doit calculer l’empreinte si le fichier était déjà scellé', async () => {
        mockSignatureEnvelopeModel.findOne.mockResolvedValue(makeEnvelope());
        mockS3Service.seal.mockResolvedValue({ versionId: 'v-sealed', alreadySealed: true });

        await service.handleWebhook(completed);

        expect(mockDocumentModel.update.mock.calls[0][0].checksumSha256).toBe(
          createHash('sha256').update(signedPdf).digest('hex'),
        );
      });

      it('doit dater la signature à la réception sans date Documenso', async () => {
        mockSignatureEnvelopeModel.findOne.mockResolvedValue(makeEnvelope());
        mockDocumensoService.getEnvelope.mockResolvedValue(
          remoteEnvelope({ status: 'COMPLETED', completedAt: null }),
        );
        const before = Date.now();

        await service.handleWebhook(completed);

        const { signedAt } = mockContractModel.update.mock.calls[0][0];

        expect(signedAt).toBeInstanceOf(Date);
        expect(signedAt.getTime()).toBeGreaterThanOrEqual(before);
      });

      it('doit ignorer une enveloppe déjà complète', async () => {
        mockSignatureEnvelopeModel.findOne.mockResolvedValue(
          makeEnvelope(SignatureStatus.COMPLETED),
        );

        await service.handleWebhook(completed);

        expect(mockDocumensoService.getEnvelope).not.toHaveBeenCalled();
        expect(mockS3Service.seal).not.toHaveBeenCalled();
      });

      it('ne doit rien sceller si Documenso ne confirme pas la complétion', async () => {
        mockSignatureEnvelopeModel.findOne.mockResolvedValue(makeEnvelope());
        mockDocumensoService.getEnvelope.mockResolvedValue(remoteEnvelope({ status: 'PENDING' }));

        await service.handleWebhook(completed);

        expect(Logger.prototype.warn).toHaveBeenCalledWith(
          'Enveloppe env-1 annoncée complète mais au statut PENDING',
        );
        expect(mockS3Service.seal).not.toHaveBeenCalled();
        expect(mockContractModel.update).not.toHaveBeenCalled();
      });

      it('ne doit pas marquer le contrat signé si le scellement échoue', async () => {
        const failure = new Error('Object Lock indisponible');
        mockSignatureEnvelopeModel.findOne.mockResolvedValue(makeEnvelope());
        mockS3Service.seal.mockRejectedValue(failure);

        await expect(service.handleWebhook(completed)).rejects.toBe(failure);
        expect(mockContractModel.update).not.toHaveBeenCalled();
      });
    });

    describe.each([
      DocumensoWebhookEvent.DOCUMENT_REJECTED,
      DocumensoWebhookEvent.DOCUMENT_CANCELLED,
    ])('%s', (event) => {
      it.each([SignatureStatus.PENDING, SignatureStatus.PARTIALLY_SIGNED])(
        'doit remettre en brouillon un contrat dont l’enveloppe est %s',
        async (status) => {
          const envelope = makeEnvelope(status);
          mockSignatureEnvelopeModel.findOne.mockResolvedValue(envelope);

          await service.handleWebhook(webhook(event));

          expect(envelope.update).toHaveBeenCalledWith(
            { status: SignatureStatus.DECLINED },
            { transaction },
          );
          expect(mockContractModel.update).toHaveBeenCalledWith(
            {
              status: ContractStatus.PENDING,
              workerSignatureId: null,
              employerSignatureId: null,
            },
            {
              where: { documentId: 42, status: ContractStatus.AWAITING_SIGNATURE },
              transaction,
            },
          );
        },
      );

      it('doit ignorer une enveloppe déjà close', async () => {
        const envelope = makeEnvelope(SignatureStatus.COMPLETED);
        mockSignatureEnvelopeModel.findOne.mockResolvedValue(envelope);

        await service.handleWebhook(webhook(event));

        expect(envelope.update).not.toHaveBeenCalled();
        expect(mockContractModel.update).not.toHaveBeenCalled();
      });
    });
  });
});
