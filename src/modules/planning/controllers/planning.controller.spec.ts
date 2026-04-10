import { Test, TestingModule } from '@nestjs/testing';
import { PlanningController } from '@/modules/planning/controllers/planning.controller';
import { PlanningService } from '@/modules/planning/services/planning.service';
import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';

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
    const mockRequest = { user: { sub: 123, app_context: 'worker' }, query: {} };

    it('should call getPlanning service method with correct parameters', async () => {
      const startDate = '2026-05-01';
      const endDate = '2026-05-15';
      const requestWithDates = { ...mockRequest, query: { startDate, endDate } };

      await controller.getPlanning(startDate, endDate, requestWithDates as unknown as Request);

      expect(mockPlanningService.getPlanning).toHaveBeenCalledWith(
        123,
        'worker',
        startDate,
        endDate,
      );
    });

    it('should throw BadRequestException if unknown parameters are passed', async () => {
      const invalidRequest = {
        query: { unknownParam: 'true' },
        user: { sub: 123, app_context: 'worker' },
      };
      await expect(() =>
        controller.getPlanning(undefined, undefined, invalidRequest as unknown as Request),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user.sub is missing', async () => {
      const requestWithoutSub = { user: { id: 456, app_context: 'worker' }, query: {} };
      await expect(() =>
        controller.getPlanning(undefined, undefined, requestWithoutSub as unknown as Request),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle request without query', async () => {
      const requestWithoutQuery = { user: { sub: 123, app_context: 'worker' } };
      await controller.getPlanning(undefined, undefined, requestWithoutQuery as unknown as Request);
      expect(mockPlanningService.getPlanning).toHaveBeenCalledWith(
        123,
        'worker',
        undefined,
        undefined,
      );
    });
  });
});
