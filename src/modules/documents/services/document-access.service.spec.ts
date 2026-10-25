import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize';
import { DocumentAccessService, DocumentActor } from './document-access.service';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { Mission } from '@/modules/missions/mission.model';
import { Conversation } from '@/modules/chat/models/conversation.model';

describe('DocumentAccessService', () => {
  let service: DocumentAccessService;

  const mockSequelize = {
    query: jest.fn(),
  };

  const mockWorkerProfileModel = { findOne: jest.fn() };
  const mockCompanyMemberModel = { findAll: jest.fn() };
  const mockPublicationModel = { findByPk: jest.fn() };
  const mockMissionModel = { findByPk: jest.fn() };
  const mockConversationModel = { findByPk: jest.fn() };

  const transaction = {} as Transaction;
  const worker: DocumentActor = { userId: 1, workerId: 3, companyIds: [] };
  const employer: DocumentActor = { userId: 2, workerId: null, companyIds: [10, 11] };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentAccessService,
        { provide: Sequelize, useValue: mockSequelize },
        { provide: getModelToken(WorkerProfile), useValue: mockWorkerProfileModel },
        { provide: getModelToken(CompanyMember), useValue: mockCompanyMemberModel },
        { provide: getModelToken(Publication), useValue: mockPublicationModel },
        { provide: getModelToken(Mission), useValue: mockMissionModel },
        { provide: getModelToken(Conversation), useValue: mockConversationModel },
      ],
    }).compile();

    service = module.get<DocumentAccessService>(DocumentAccessService);

    jest.clearAllMocks();
  });

  describe('resolveActor', () => {
    it('doit renvoyer le profil worker et les entreprises de l’utilisateur', async () => {
      mockWorkerProfileModel.findOne.mockResolvedValue({ id: 3 });
      mockCompanyMemberModel.findAll.mockResolvedValue([{ companyId: 10 }, { companyId: 11 }]);

      await expect(service.resolveActor(1)).resolves.toEqual({
        userId: 1,
        workerId: 3,
        companyIds: [10, 11],
      });
      expect(mockWorkerProfileModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 1 } }),
      );
      expect(mockCompanyMemberModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 1 } }),
      );
    });

    it('doit renvoyer null et une liste vide sans profil worker ni entreprise', async () => {
      mockWorkerProfileModel.findOne.mockResolvedValue(null);
      mockCompanyMemberModel.findAll.mockResolvedValue([]);

      await expect(service.resolveActor(1)).resolves.toEqual({
        userId: 1,
        workerId: null,
        companyIds: [],
      });
    });
  });

  describe('readableDocumentIds', () => {
    it('doit injecter l’utilisateur, son worker et ses entreprises', () => {
      const sql = service.readableDocumentIds({ userId: 1, workerId: 3, companyIds: [10, 11] });

      expect(sql).toContain('a.user_id = 1');
      expect(sql).toContain('a.worker_id = 3');
      expect(sql).toContain('m.worker_id = 3');
      expect(sql).toContain('a.company_id = ANY(ARRAY[10,11]::int[])');
      expect(sql).toContain('p.company_id = ANY(ARRAY[10,11]::int[])');
    });

    it('doit utiliser NULL sans profil worker et un tableau vide sans entreprise', () => {
      const sql = service.readableDocumentIds({ userId: 1, workerId: null, companyIds: [] });

      expect(sql).toContain('a.worker_id = NULL');
      expect(sql).toContain('ARRAY[]::int[]');
    });

    it.each([
      { userId: 1.5, workerId: null, companyIds: [] },
      { userId: 1, workerId: Number.NaN, companyIds: [] },
      { userId: 1, workerId: null, companyIds: [Infinity] },
    ])('doit refuser un identifiant non entier (%p)', (actor) => {
      expect(() => service.readableDocumentIds(actor)).toThrow(
        "Identifiant invalide dans une règle d'accès",
      );
    });
  });

  describe('canRead', () => {
    it('doit autoriser la lecture si le document fait partie des documents lisibles', async () => {
      mockSequelize.query.mockResolvedValue([[{ '?column?': 1 }]]);

      await expect(service.canRead(worker, 5, transaction)).resolves.toBe(true);
      expect(mockSequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = :documentId AND id IN'),
        { replacements: { documentId: 5 }, transaction },
      );
    });

    it('doit refuser la lecture sinon', async () => {
      mockSequelize.query.mockResolvedValue([[]]);

      await expect(service.canRead(worker, 5)).resolves.toBe(false);
    });
  });

  describe('missionParties / conversationParties', () => {
    it('doit renvoyer les parties de la mission', async () => {
      mockMissionModel.findByPk.mockResolvedValue({ workerId: 3, companyId: 10 });

      await expect(service.missionParties(8, transaction)).resolves.toEqual({
        workerId: 3,
        companyId: 10,
      });
      expect(mockMissionModel.findByPk).toHaveBeenCalledWith(8, {
        attributes: ['workerId', 'companyId'],
        transaction,
      });
    });

    it('doit renvoyer les parties de la conversation', async () => {
      mockConversationModel.findByPk.mockResolvedValue({ workerId: 3, companyId: null });

      await expect(service.conversationParties(4)).resolves.toEqual({
        workerId: 3,
        companyId: null,
      });
      expect(mockConversationModel.findByPk).toHaveBeenCalledWith(4, {
        attributes: ['workerId', 'companyId'],
        transaction: undefined,
      });
    });

    it('doit renvoyer null si la mission n’existe pas', async () => {
      mockMissionModel.findByPk.mockResolvedValue(null);

      await expect(service.missionParties(404)).resolves.toBeNull();
    });

    it('doit renvoyer null si la conversation n’existe pas', async () => {
      mockConversationModel.findByPk.mockResolvedValue(null);

      await expect(service.conversationParties(404)).resolves.toBeNull();
    });
  });

  describe('publicationCompanyId', () => {
    it('doit renvoyer l’entreprise de la publication', async () => {
      mockPublicationModel.findByPk.mockResolvedValue({ companyId: 10 });

      await expect(service.publicationCompanyId(2, transaction)).resolves.toBe(10);
      expect(mockPublicationModel.findByPk).toHaveBeenCalledWith(2, {
        attributes: ['companyId'],
        transaction,
      });
    });

    it('doit renvoyer null si la publication n’existe pas', async () => {
      mockPublicationModel.findByPk.mockResolvedValue(null);

      await expect(service.publicationCompanyId(404)).resolves.toBeNull();
    });
  });

  describe('isParty / isCompanySide', () => {
    const parties = { workerId: 3, companyId: 10 };

    it('doit reconnaître le worker de la mission', () => {
      expect(DocumentAccessService.isParty(worker, parties)).toBe(true);
      expect(DocumentAccessService.isCompanySide(worker, parties)).toBe(false);
    });

    it('doit reconnaître un membre de l’entreprise de la mission', () => {
      expect(DocumentAccessService.isParty(employer, parties)).toBe(true);
      expect(DocumentAccessService.isCompanySide(employer, parties)).toBe(true);
    });

    it('doit rejeter un tiers', () => {
      const stranger: DocumentActor = { userId: 9, workerId: 99, companyIds: [99] };

      expect(DocumentAccessService.isParty(stranger, parties)).toBe(false);
    });

    it('ne doit pas confondre deux workers absents', () => {
      const noWorker = { workerId: null, companyId: null };

      expect(DocumentAccessService.isParty(employer, noWorker)).toBe(false);
      expect(DocumentAccessService.isCompanySide(employer, noWorker)).toBe(false);
    });
  });
});
