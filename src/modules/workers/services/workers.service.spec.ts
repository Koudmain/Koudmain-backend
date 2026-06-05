import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { WorkersService } from './workers.service';
import { WorkerProfile } from '../models/worker-profile.model';
import { NotFoundException } from '@nestjs/common';
import { CreationAttributes } from 'sequelize';

describe('WorkersService', () => {
  let service: WorkersService;

  const mockWorkerProfileModel = {
    create: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkersService,
        {
          provide: getModelToken(WorkerProfile),
          useValue: mockWorkerProfileModel,
        },
      ],
    }).compile();

    service = module.get<WorkersService>(WorkersService);

    jest.clearAllMocks();
  });

  it('doit être défini', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('doit créer et retourner un profil worker avec succès', async () => {
      const dto: CreationAttributes<WorkerProfile> = {
        userId: 1,
        max_distance_km: 30,
        skillsDescription: 'Café',
      };

      const createdProfile = { id: 10, ...dto };
      mockWorkerProfileModel.create.mockResolvedValue(createdProfile);

      const result = await service.create(dto);

      expect(mockWorkerProfileModel.create).toHaveBeenCalledWith(dto, { transaction: undefined });
      expect(result).toEqual(createdProfile);
    });
  });

  describe('getWorkerIdByUserId', () => {
    const userId = 42;

    it('doit retourner uniquement l’ID du worker si le profil existe', async () => {
      const mockWorkerResult = { id: 10 };
      mockWorkerProfileModel.findOne.mockResolvedValue(mockWorkerResult);

      const result = await service.getWorkerIdByUserId(userId);

      expect(mockWorkerProfileModel.findOne).toHaveBeenCalledWith({
        where: { userId },
        attributes: ['id'],
      });
      expect(result).toBe(10);
    });

    it('doit lever une NotFoundException si le profil n’existe pas', async () => {
      mockWorkerProfileModel.findOne.mockResolvedValue(null);

      await expect(service.getWorkerIdByUserId(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWorkerByUserId', () => {
    const userId = 42;

    it('doit retourner le profil complet du worker si il existe', async () => {
      const mockFullWorker = {
        id: 10,
        userId: userId,
        max_distance_km: 20,
        skillsDescription: 'Barman',
      };
      mockWorkerProfileModel.findOne.mockResolvedValue(mockFullWorker);

      const result = await service.getWorkerByUserId(userId);

      expect(mockWorkerProfileModel.findOne).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toEqual(mockFullWorker);
    });

    it('doit lever une NotFoundException si le profil complet n’existe pas', async () => {
      mockWorkerProfileModel.findOne.mockResolvedValue(null);

      await expect(service.getWorkerByUserId(userId)).rejects.toThrow(NotFoundException);
    });
  });
});
