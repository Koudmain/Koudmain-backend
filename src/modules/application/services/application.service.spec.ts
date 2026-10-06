import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { ApplicationService } from './application.service';
import { Application, ApplicationStatus } from '../models/application.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { WorkerDocument } from '@/modules/workers/models/worker-document.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { ChatService } from '@/modules/chat/services/chat.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

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

    it('doit envoyer un message si le champ message est fourni', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue(publication);
      mockApplicationModel.findOne.mockResolvedValue(null);
      mockApplicationModel.create.mockResolvedValue({ id: 1 });
      mockChatService.findOrCreateConversation.mockResolvedValue({ id: 99 });
      mockChatService.sendMessage.mockResolvedValue({ id: 100 });

      await service.apply(userId, { publicationId: 5, message: 'Dispo demain !' });

      expect(mockChatService.findOrCreateConversation).toHaveBeenCalledWith(5, 10, 2);
      expect(mockChatService.sendMessage).toHaveBeenCalledWith(userId, 99, 'Dispo demain !');
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

    it('doit lever BadRequestException si la publication a expiré', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue({
        id: 5,
        ending_date: new Date(Date.now() - 1000 * 60),
      });

      await expect(service.apply(userId, { publicationId: 5 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('doit lever ConflictException si déjà postulé', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue(publication);
      mockApplicationModel.findOne.mockResolvedValue({ id: 9 });

      await expect(service.apply(userId, { publicationId: 5 })).rejects.toThrow(ConflictException);
    });

    it('doit lever ForbiddenException si KYC requis et non validé', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockWorkerDocumentModel.findOne.mockResolvedValue(null);

      await expect(service.apply(userId, { publicationId: 5 }, true)).rejects.toThrow(
        ForbiddenException,
      );
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
