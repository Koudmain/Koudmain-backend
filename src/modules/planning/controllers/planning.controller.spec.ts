import { Test, TestingModule } from '@nestjs/testing';
import { PlanningController } from './planning.controller';
import { PlanningService } from '../services/planning.service';
import { BadRequestException } from '@nestjs/common';

describe('PlanningController', () => {
  let controller: PlanningController;
  let service: PlanningService;

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
    service = module.get<PlanningService>(PlanningService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPlanning', () => {
    const mockRequest = { user: { sub: 123 }, query: {} };

    it('should call getPlanning service method with correct parameters', async () => {
      const startDate = '2026-05-01';
      const endDate = '2026-05-15';
      const requestWithDates = { ...mockRequest, query: { startDate, endDate } };

      await controller.getPlanning(startDate, endDate, requestWithDates);

      expect(service.getPlanning).toHaveBeenCalledWith(123, startDate, endDate);
    });

    it('should throw BadRequestException if unknown parameters are passed', async () => {
      const invalidRequest = { query: { unknownParam: 'true' }, user: { sub: 123 } };
      await expect(
        controller.getPlanning(undefined, undefined, invalidRequest as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user.sub is missing', async () => {
      const requestWithoutSub = { user: { id: 456 }, query: {} };
      await expect(
        controller.getPlanning(undefined, undefined, requestWithoutSub as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle request without query', async () => {
      const requestWithoutQuery = { user: { sub: 123 } };
      await controller.getPlanning(undefined, undefined, requestWithoutQuery as any);
      expect(service.getPlanning).toHaveBeenCalledWith(123, undefined, undefined);
    });
  });
});
