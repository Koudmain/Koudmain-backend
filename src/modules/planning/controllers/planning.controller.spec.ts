import { Test, TestingModule } from '@nestjs/testing';
import { PlanningController } from '@/modules/planning/controllers/planning.controller';
import { PlanningService } from '@/modules/planning/services/planning.service';
import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import type { JwtPayload } from '@/decorators/current-user.decorator';

describe('PlanningController', () => {
  let controller: PlanningController;

  const mockPlanningService = {
    getPlanning: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanningController],
      providers: [
        {
          provide: PlanningService,
          useValue: mockPlanningService,
        },
      ],
    }).compile();

    controller = module.get<PlanningController>(PlanningController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPlanning', () => {
    const mockUser: JwtPayload = { sub: 123, app_context: 'worker' };

    it('should call getPlanning service method with correct parameters', async () => {
      const startDate = '2026-05-01';
      const endDate = '2026-05-15';
      const activeCompanyId = 10;
      const requestWithDates = {
        query: { startDate: startDate, endDate: endDate, activeCompanyId: activeCompanyId },
      };

      await controller.getPlanning(
        startDate,
        endDate,
        activeCompanyId,
        mockUser,
        requestWithDates as unknown as Request,
      );

      expect(mockPlanningService.getPlanning).toHaveBeenCalledWith(
        123,
        'worker',
        startDate,
        endDate,
        activeCompanyId,
      );
    });

    it('should throw BadRequestException if unknown parameters are passed', async () => {
      const invalidRequest = { query: { unknownParam: 'true' } };
      await expect(() =>
        controller.getPlanning(
          undefined,
          undefined,
          undefined,
          mockUser,
          invalidRequest as unknown as Request,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user.sub is missing', async () => {
      const userWithoutSub = { app_context: 'worker' } as unknown as JwtPayload;
      const requestWithoutSub = { query: {} };
      await expect(() =>
        controller.getPlanning(
          undefined,
          undefined,
          undefined,
          userWithoutSub,
          requestWithoutSub as unknown as Request,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle request without query', async () => {
      const requestWithoutQuery = {};
      await controller.getPlanning(
        undefined,
        undefined,
        undefined,
        mockUser,
        requestWithoutQuery as unknown as Request,
      );
      expect(mockPlanningService.getPlanning).toHaveBeenCalledWith(
        123,
        'worker',
        undefined,
        undefined,
        undefined,
      );
    });
  });
});
