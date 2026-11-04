import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { WorkersController } from '@/modules/workers/controllers/workers.controller';
import { WorkersService } from '@/modules/workers/services/workers.service';
import type { Request as ExpressRequest } from 'express';
import { ROLES_KEY } from '@/decorators/roles.decorator';
import { UserRole } from '@/modules/users/models/user.model';

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
    getOwnProfile: jest.fn(),
    updateOwnProfile: jest.fn(),
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
        skillsDescription: 'Développeur NestJS',
      };

      mockWorkersService.getWorkerByUserId.mockResolvedValue(mockProfile);

      const result = await controller.getMyProfile(mockReq);

      expect(mockWorkersService.getWorkerByUserId).toHaveBeenCalledWith(userId);

      expect(result).toEqual(mockProfile);
    });
  });
  describe('getOwnProfile / updateOwnProfile', () => {
    const mockReq = { user: { sub: 42, email: 'worker@test.com' } } as RequestWithUser;

    it("should return the logged-in user's profile", async () => {
      mockWorkersService.getOwnProfile.mockResolvedValue({ id: 1 });

      await expect(controller.getOwnProfile(mockReq)).resolves.toEqual({ id: 1 });
      expect(mockWorkersService.getOwnProfile).toHaveBeenCalledWith(42);
    });

    it('should forward the changes for the logged-in user', async () => {
      const body = { bio: 'Nouvelle bio' };
      mockWorkersService.updateOwnProfile.mockResolvedValue({ id: 1 });

      await expect(controller.updateOwnProfile(mockReq, body)).resolves.toEqual({ id: 1 });
      expect(mockWorkersService.updateOwnProfile).toHaveBeenCalledWith(42, body);
    });
  });

  describe('roles metadata', () => {
    const reflector = new Reflector();

    it('should require WORKER role on getMyProfile, getOwnProfile, and updateOwnProfile', () => {
      expect(reflector.get<UserRole[]>(ROLES_KEY, controller.getMyProfile)).toEqual([
        UserRole.WORKER,
      ]);
      expect(reflector.get<UserRole[]>(ROLES_KEY, controller.getOwnProfile)).toEqual([
        UserRole.WORKER,
      ]);
      expect(reflector.get<UserRole[]>(ROLES_KEY, controller.updateOwnProfile)).toEqual([
        UserRole.WORKER,
      ]);
    });

    it('should require EMPLOYER role on getPublicProfile', () => {
      expect(reflector.get<UserRole[]>(ROLES_KEY, controller.getPublicProfile)).toEqual([
        UserRole.EMPLOYER,
      ]);
    });
  });
});
