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
    const mock_user: JwtPayload = { sub: 123, app_context: 'worker' };

    it('should call getPlanning service method with correct parameters', async () => {
      const start_date = '2026-05-01';
      const end_date = '2026-05-15';
      const active_company_id = 10;
      const request_with_dates = {
        query: { startDate: start_date, endDate: end_date, activeCompanyId: active_company_id },
      };

      await controller.getPlanning(
        start_date,
        end_date,
        active_company_id,
        mock_user,
        request_with_dates as unknown as Request,
      );

      expect(mockPlanningService.getPlanning).toHaveBeenCalledWith(
        123,
        'worker',
        start_date,
        end_date,
        10,
      );
    });

    it('should throw BadRequestException if unknown parameters are passed', async () => {
      const invalid_request = { query: { unknownParam: 'true' } };
      await expect(() =>
        controller.getPlanning(
          undefined,
          undefined,
          undefined,
          mock_user,
          invalid_request as unknown as Request,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user.sub is missing', async () => {
      const user_without_sub = { app_context: 'worker' } as unknown as JwtPayload;
      const request_without_sub = { query: {} };
      await expect(() =>
        controller.getPlanning(
          undefined,
          undefined,
          undefined,
          user_without_sub,
          request_without_sub as unknown as Request,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle request without query', async () => {
      const request_without_query = {};
      await controller.getPlanning(
        undefined,
        undefined,
        undefined,
        mock_user,
        request_without_query as unknown as Request,
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
