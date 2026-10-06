import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationController } from './application.controller';
import { ApplicationService } from '../services/application.service';
import { ApplicationStatus } from '../models/application.model';
import { UnauthorizedException } from '@nestjs/common';
import type { JwtPayload } from '@/decorators/current-user.decorator';

const mockApplicationService = {
  apply: jest.fn(),
  getMyApplications: jest.fn(),
  getApplicationsByPublication: jest.fn(),
  updateStatus: jest.fn(),
  cancel: jest.fn(),
};

describe('ApplicationController', () => {
  let controller: ApplicationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationController],
      providers: [
        {
          provide: ApplicationService,
          useValue: mockApplicationService,
        },
      ],
    }).compile();

    controller = module.get<ApplicationController>(ApplicationController);
    jest.clearAllMocks();
  });

  it('doit être défini', () => {
    expect(controller).toBeDefined();
  });

  describe('apply', () => {
    it('doit appeler ApplicationService.apply avec sub', async () => {
      const mockResult = { id: 1 };
      mockApplicationService.apply.mockResolvedValue(mockResult);

      const res = await controller.apply({ sub: 42 }, { publicationId: 10, message: 'Salut' });

      expect(mockApplicationService.apply).toHaveBeenCalledWith(42, {
        publicationId: 10,
        message: 'Salut',
      });
      expect(res).toBe(mockResult);
    });

    it('doit lever UnauthorizedException si user est absent', async () => {
      await expect(
        controller.apply(undefined as unknown as JwtPayload, { publicationId: 10 }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMyApplications', () => {
    it('doit appeler ApplicationService.getMyApplications', async () => {
      mockApplicationService.getMyApplications.mockResolvedValue([]);

      const res = await controller.getMyApplications({ sub: 42 });

      expect(mockApplicationService.getMyApplications).toHaveBeenCalledWith(42);
      expect(res).toEqual([]);
    });
  });

  describe('getApplicationsByPublication', () => {
    it('doit appeler ApplicationService.getApplicationsByPublication', async () => {
      mockApplicationService.getApplicationsByPublication.mockResolvedValue([]);

      const res = await controller.getApplicationsByPublication({ sub: 42 }, 15);

      expect(mockApplicationService.getApplicationsByPublication).toHaveBeenCalledWith(42, 15);
      expect(res).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    it('doit appeler ApplicationService.updateStatus', async () => {
      const mockResult = { id: 1, status: ApplicationStatus.ACCEPTED };
      mockApplicationService.updateStatus.mockResolvedValue(mockResult);

      const res = await controller.updateStatus({ sub: 42 }, 1, {
        status: ApplicationStatus.ACCEPTED,
      });

      expect(mockApplicationService.updateStatus).toHaveBeenCalledWith(
        42,
        1,
        ApplicationStatus.ACCEPTED,
      );
      expect(res).toBe(mockResult);
    });
  });

  describe('cancel', () => {
    it('doit appeler ApplicationService.cancel', async () => {
      mockApplicationService.cancel.mockResolvedValue({ message: 'OK' });

      const res = await controller.cancel({ sub: 42 }, 1);

      expect(mockApplicationService.cancel).toHaveBeenCalledWith(42, 1);
      expect(res).toEqual({ message: 'OK' });
    });
  });
});
