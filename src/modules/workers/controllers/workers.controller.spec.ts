import { Test, TestingModule } from '@nestjs/testing';
import { WorkersController } from './workers.controller';
import { WorkersService } from '@/modules/workers/services/workers.service';
import type { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

describe('WorkersController', () => {
  let controller: WorkersController;

  const mockWorkersService = {
    getWorkerByUserId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkersController],
      providers: [
        {
          provide: WorkersService,
          useValue: mockWorkersService,
        },
      ],
    }).compile();

    controller = module.get<WorkersController>(WorkersController);

    jest.clearAllMocks();
  });

  it('doit être défini', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyProfile', () => {
    it('doit extraire le userId de la requête et retourner le profil du worker', async () => {
      const userId = 42;

      const mockReq = {
        user: {
          sub: userId,
          email: 'worker@test.com',
        },
      } as RequestWithUser;

      const mockProfile = {
        id: 1,
        userId: userId,
        max_distance_km: 25,
        skills_description: 'Développeur NestJS',
      };

      mockWorkersService.getWorkerByUserId.mockResolvedValue(mockProfile);

      const result = await controller.getMyProfile(mockReq);

      expect(mockWorkersService.getWorkerByUserId).toHaveBeenCalledWith(userId);

      expect(result).toEqual(mockProfile);
    });
  });
});
