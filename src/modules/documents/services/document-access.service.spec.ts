import { Test, TestingModule } from '@nestjs/testing';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize';
import { DocumentAccessService, DocumentActor } from './document-access.service';

describe('DocumentAccessService', () => {
  let service: DocumentAccessService;

  const mockSequelize = {
    query: jest.fn(),
  };

  const transaction = {} as Transaction;
  const worker: DocumentActor = { userId: 1, workerId: 3, companyIds: [] };
  const employer: DocumentActor = { userId: 2, workerId: null, companyIds: [10, 11] };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentAccessService, { provide: Sequelize, useValue: mockSequelize }],
    }).compile();

    service = module.get<DocumentAccessService>(DocumentAccessService);

    jest.clearAllMocks();
  });

  describe('resolveActor', () => {
    it('doit renvoyer le profil worker et les entreprises de l’utilisateur', async () => {
      mockSequelize.query.mockResolvedValue([[{ workerId: 3, companyIds: [10] }]]);

      await expect(service.resolveActor(1)).resolves.toEqual({
        userId: 1,
        workerId: 3,
        companyIds: [10],
      });
      expect(mockSequelize.query).toHaveBeenCalledWith(expect.any(String), {
        replacements: { userId: 1 },
      });
    });

    it('doit renvoyer une liste vide si aucune entreprise n’est remontée', async () => {
      mockSequelize.query.mockResolvedValue([[{ workerId: null, companyIds: null }]]);

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
      mockSequelize.query.mockResolvedValue([[{ workerId: 3, companyId: 10 }]]);

      await expect(service.missionParties(8, transaction)).resolves.toEqual({
        workerId: 3,
        companyId: 10,
      });
      expect(mockSequelize.query).toHaveBeenCalledWith(expect.stringContaining('FROM "mission"'), {
        replacements: { id: 8 },
        transaction,
      });
    });

    it('doit renvoyer les parties de la conversation', async () => {
      mockSequelize.query.mockResolvedValue([[{ workerId: 3, companyId: 10 }]]);

      await service.conversationParties(4);

      expect(mockSequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM "conversation"'),
        { replacements: { id: 4 }, transaction: undefined },
      );
    });

    it('doit renvoyer null si la mission n’existe pas', async () => {
      mockSequelize.query.mockResolvedValue([[]]);

      await expect(service.missionParties(404)).resolves.toBeNull();
    });
  });

  describe('publicationCompanyId', () => {
    it('doit renvoyer l’entreprise de la publication', async () => {
      mockSequelize.query.mockResolvedValue([[{ companyId: 10 }]]);

      await expect(service.publicationCompanyId(2)).resolves.toBe(10);
    });

    it('doit renvoyer null si la publication n’existe pas', async () => {
      mockSequelize.query.mockResolvedValue([[]]);

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
