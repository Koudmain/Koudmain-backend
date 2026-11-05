import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { ApplicationService } from './application.service';
import { Application, ApplicationStatus } from '@/modules/application/models/application.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { WorkerDocument, WorkerDocumentType } from '@/modules/workers/models/worker-document.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { ChatService } from '@/modules/chat/services/chat.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApplicationErrorCode } from '@/modules/application/enums/application-error-code.enum';

describe('ApplicationService', () => {
  let service: ApplicationService;

  const mockApplicationModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  };

  const mockPublicationModel = {
    findByPk: jest.fn(),
  };

  const mockWorkerProfileModel = {
    findByPk: jest.fn(),
  };

  const mockWorkerDocumentModel = {
    findOne: jest.fn(),
    findAll: jest.fn(),
  };

  const mockCompanyMemberModel = {
    findOne: jest.fn(),
  };

  const mockWorkersService = {
    getWorkerByUserId: jest.fn(),
    getWorkerIdByUserId: jest.fn(),
  };

  const mockChatService = {
    findOrCreateConversation: jest.fn(),
    sendMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationService,
        {
          provide: getModelToken(Application),
          useValue: mockApplicationModel,
        },
        {
          provide: getModelToken(Publication),
          useValue: mockPublicationModel,
        },
        {
          provide: getModelToken(WorkerProfile),
          useValue: mockWorkerProfileModel,
        },
        {
          provide: getModelToken(WorkerDocument),
          useValue: mockWorkerDocumentModel,
        },
        {
          provide: getModelToken(CompanyMember),
          useValue: mockCompanyMemberModel,
        },
        {
          provide: WorkersService,
          useValue: mockWorkersService,
        },
        {
          provide: ChatService,
          useValue: mockChatService,
        },
      ],
    }).compile();

    service = module.get<ApplicationService>(ApplicationService);
    jest.clearAllMocks();
    mockWorkerDocumentModel.findAll.mockResolvedValue([
      { type: WorkerDocumentType.IDENTITY },
      { type: WorkerDocumentType.NIR },
      { type: WorkerDocumentType.PROOF_OF_ADDRESS },
      // { type: WorkerDocumentType.RIB },                  // Uncomment this line if RIB is also required for KYC
    ]);
  });

  it('doit être défini', () => {
    expect(service).toBeDefined();
  });

  describe('apply', () => {
    const userId = 1;
    const workerProfile = { id: 10, userId };
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24);
    const publication = {
      id: 5,
      companyId: 2,
      ending_date: futureDate,
    };

    it('doit créer une candidature avec succès sans message', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue(publication);
      mockApplicationModel.findOne.mockResolvedValue(null);
      mockApplicationModel.create.mockResolvedValue({
        id: 1,
        publicationId: 5,
        workerId: 10,
        status: ApplicationStatus.PENDING,
      });

      const result = await service.apply(userId, { publicationId: 5 });

      expect(result).toBeDefined();
      expect(mockApplicationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          publicationId: 5,
          workerId: 10,
          status: ApplicationStatus.PENDING,
        }),
      );
      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });

    it('doit envoyer le message avant de créer la candidature', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue(publication);
      mockApplicationModel.findOne.mockResolvedValue(null);
      mockChatService.findOrCreateConversation.mockResolvedValue({ id: 99 });

      const callOrder: string[] = [];
      mockChatService.sendMessage.mockImplementation(async () => {
        callOrder.push('sendMessage');
        return { id: 100 };
      });
      mockApplicationModel.create.mockImplementation(async () => {
        callOrder.push('createApplication');
        return { id: 1 };
      });

      await service.apply(userId, { publicationId: 5, message: 'Dispo demain !' });

      expect(mockChatService.findOrCreateConversation).toHaveBeenCalledWith(5, 10, 2);
      expect(mockChatService.sendMessage).toHaveBeenCalledWith(userId, 99, 'Dispo demain !');
      expect(mockApplicationModel.create).toHaveBeenCalled();
      expect(callOrder).toEqual(['sendMessage', 'createApplication']);
    });

    it('doit lever BadRequestException avec code MESSAGE_TOO_LONG si le message dépasse 150 caractères', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue(publication);
      mockApplicationModel.findOne.mockResolvedValue(null);

      const longMessage = 'a'.repeat(151);

      try {
        await service.apply(userId, { publicationId: 5, message: longMessage });
        fail('Devrait lever une exception');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect((err as BadRequestException).getResponse()).toMatchObject({
          code: ApplicationErrorCode.MESSAGE_TOO_LONG,
        });
      }
      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
      expect(mockApplicationModel.create).not.toHaveBeenCalled();
    });

    it('doit lever NotFoundException si le worker n’existe pas', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(null);

      await expect(service.apply(userId, { publicationId: 5 })).rejects.toThrow(NotFoundException);
    });

    it('doit lever NotFoundException si la publication n’existe pas', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue(null);

      await expect(service.apply(userId, { publicationId: 5 })).rejects.toThrow(NotFoundException);
    });

    it('doit lever BadRequestException avec code OFFER_EXPIRED si la publication a expiré', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue({
        id: 5,
        ending_date: new Date(Date.now() - 1000 * 60),
      });

      try {
        await service.apply(userId, { publicationId: 5 });
        fail('Devrait lever une exception');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect((err as BadRequestException).getResponse()).toMatchObject({
          code: ApplicationErrorCode.OFFER_EXPIRED,
        });
      }
    });

    it('doit lever ConflictException si déjà postulé', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue(publication);
      mockApplicationModel.findOne.mockResolvedValue({ id: 9 });

      await expect(service.apply(userId, { publicationId: 5 })).rejects.toThrow(ConflictException);
    });

    it('doit lever ForbiddenException avec liste des documents manquants si KYC incomplet', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      // Only IDENTITY is verified; NIR, PROOF_OF_ADDRESS, and RIB are missing
      mockWorkerDocumentModel.findAll.mockResolvedValue([{ type: WorkerDocumentType.IDENTITY }]);

      try {
        await service.apply(userId, { publicationId: 5 });
        fail('Devrait lever une ForbiddenException');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ForbiddenException);
        const response = (err as ForbiddenException).getResponse() as Record<string, unknown>;
        expect(response).toMatchObject({
          code: ApplicationErrorCode.KYC_REQUIRED,
          missingDocuments: [
            WorkerDocumentType.NIR,
            WorkerDocumentType.PROOF_OF_ADDRESS,
            // WorkerDocumentType.RIB,           // Uncomment this line if RIB is also required for KYC
          ],
        });
      }
    });
  });

  describe('checkEligibility', () => {
    const userId = 1;
    const publicationId = 5;
    const workerProfile = { id: 10, userId };
    const publication = { id: 5, ending_date: null };

    it('doit retourner canApply: true si tout est valide', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue(publication);
      mockApplicationModel.findOne.mockResolvedValue(null);
      mockWorkerDocumentModel.findAll.mockResolvedValue([
        { type: WorkerDocumentType.IDENTITY },
        { type: WorkerDocumentType.NIR },
        { type: WorkerDocumentType.PROOF_OF_ADDRESS },
        // { type: WorkerDocumentType.RIB },              // Uncomment this line if RIB is also required for KYC
      ]);

      const result = await service.checkEligibility(userId, publicationId);
      expect(result).toEqual({ canApply: true, completionPercentage: 100 });
    });

    it('doit lever NotFoundException si profil worker introuvable', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(null);

      await expect(service.checkEligibility(userId, publicationId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('doit lever NotFoundException si publication introuvable', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue(null);

      await expect(service.checkEligibility(userId, publicationId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('doit retourner canApply: false avec OFFER_EXPIRED si offre expirée', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue({
        id: 5,
        ending_date: new Date(Date.now() - 1000 * 60),
      });

      const result = await service.checkEligibility(userId, publicationId);
      expect(result).toMatchObject({
        canApply: false,
        reason: ApplicationErrorCode.OFFER_EXPIRED,
      });
    });

    it('doit retourner canApply: false avec ALREADY_APPLIED si déjà postulé', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue(publication);
      mockApplicationModel.findOne.mockResolvedValue({ id: 99 });

      const result = await service.checkEligibility(userId, publicationId);
      expect(result).toMatchObject({
        canApply: false,
        reason: ApplicationErrorCode.ALREADY_APPLIED,
      });
    });

    it('doit retourner canApply: false avec KYC_REQUIRED et missingDocuments si KYC incomplet', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue(publication);
      mockApplicationModel.findOne.mockResolvedValue(null);
      mockWorkerDocumentModel.findAll.mockResolvedValue([{ type: WorkerDocumentType.IDENTITY }]);

      const result = await service.checkEligibility(userId, publicationId);
      expect(result).toMatchObject({
        canApply: false,
        reason: ApplicationErrorCode.KYC_REQUIRED,
        missingDocuments: [
          WorkerDocumentType.NIR,
          WorkerDocumentType.PROOF_OF_ADDRESS,
          // WorkerDocumentType.RIB,                // Uncomment this line if RIB is also required for KYC
        ],
        completionPercentage: 33,
      });
    });
  });

  describe('getMyApplications', () => {
    it('doit lister les candidatures du profil worker', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue({ id: 10 });
      mockApplicationModel.findAll.mockResolvedValue([{ id: 1, publicationId: 5 }]);

      const result = await service.getMyApplications(1);

      expect(result).toHaveLength(1);
      expect(mockApplicationModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workerId: 10 },
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('doit mettre à jour le statut si utilisateur membre de l’entreprise', async () => {
      const mockApp = {
        id: 1,
        status: ApplicationStatus.PENDING,
        publication: { companyId: 2, createdByUserId: 999 },
        save: jest.fn().mockResolvedValue(true),
      };
      mockApplicationModel.findByPk.mockResolvedValue(mockApp);
      mockCompanyMemberModel.findOne.mockResolvedValue({ id: 10, companyId: 2, userId: 1 });

      const res = await service.updateStatus(1, 1, ApplicationStatus.ACCEPTED);

      expect(mockApp.status).toBe(ApplicationStatus.ACCEPTED);
      expect(mockApp.save).toHaveBeenCalled();
      expect(res).toBe(mockApp);
    });

    it('doit lever ForbiddenException si l’utilisateur n’a pas les droits', async () => {
      const mockApp = {
        id: 1,
        publication: { companyId: 2, createdByUserId: 999 },
      };
      mockApplicationModel.findByPk.mockResolvedValue(mockApp);
      mockCompanyMemberModel.findOne.mockResolvedValue(null);

      await expect(service.updateStatus(1, 1, ApplicationStatus.ACCEPTED)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('cancel', () => {
    it('doit supprimer la candidature si en attente et travailleur propriétaire', async () => {
      const mockApp = {
        id: 1,
        workerId: 10,
        status: ApplicationStatus.PENDING,
        destroy: jest.fn().mockResolvedValue(true),
      };
      mockWorkersService.getWorkerByUserId.mockResolvedValue({ id: 10 });
      mockApplicationModel.findByPk.mockResolvedValue(mockApp);

      const res = await service.cancel(1, 1);

      expect(mockApp.destroy).toHaveBeenCalled();
      expect(res).toEqual({ message: 'Candidature annulée avec succès' });
    });

    it('doit lever BadRequestException si la candidature n’est plus en attente', async () => {
      const mockApp = {
        id: 1,
        workerId: 10,
        status: ApplicationStatus.ACCEPTED,
      };
      mockWorkersService.getWorkerByUserId.mockResolvedValue({ id: 10 });
      mockApplicationModel.findByPk.mockResolvedValue(mockApp);

      await expect(service.cancel(1, 1)).rejects.toThrow(BadRequestException);
    });
  });
});
