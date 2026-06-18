import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { WorkerTrade } from '@/modules/workers/models/worker-trade.model';
import { NotFoundException } from '@nestjs/common';

describe('WorkersService', () => {
  let service: WorkersService;

  const mockWorkerProfileModel = {
    create: jest.fn(),
    findOne: jest.fn(),
  };

  const mockWorkerTradeModel = {
    bulkCreate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkersService,
        {
          provide: getModelToken(WorkerProfile),
          useValue: mockWorkerProfileModel,
        },
        {
          provide: getModelToken(WorkerTrade),
          useValue: mockWorkerTradeModel,
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
      const dto = {
        userId: 1,
        bio: 'Super worker',
        workRadius: 30,
        skillCategoryIds: [1, 2],
      };

      const createdProfile = { id: 10, userId: 1, bio: 'Super worker', workRadius: 30 };
      mockWorkerProfileModel.create.mockResolvedValue(createdProfile);
      mockWorkerTradeModel.bulkCreate.mockResolvedValue([]);

      const result = await service.create(dto);

      expect(mockWorkerProfileModel.create).toHaveBeenCalledWith(
        { userId: 1, bio: 'Super worker', workRadius: 30, addressId: undefined },
        { transaction: undefined },
      );
      expect(mockWorkerTradeModel.bulkCreate).toHaveBeenCalledWith(
        [
          { workerId: 10, skillCategoryId: 1 },
          { workerId: 10, skillCategoryId: 2 },
        ],
        { transaction: undefined },
      );
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
