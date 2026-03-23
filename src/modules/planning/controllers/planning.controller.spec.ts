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
    it('should call getPlanning service method with correct parameters', async () => {
      const req = { query: { startDate: '2026-01-01', endDate: '2026-01-31' } };
      await controller.getPlanning('2026-01-01', '2026-01-31', req);

      expect(service.getPlanning).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
    });

    it('should throw BadRequestException if extra parameters are present', async () => {
      const req = { query: { startDate: '2026-01-01', endDate: '2026-01-31', page: '2' } };

      await expect(controller.getPlanning('2026-01-01', '2026-01-31', req))
        .rejects
        .toThrow(BadRequestException);
      await expect(controller.getPlanning('2026-01-01', '2026-01-31', req))
        .rejects
        .toThrow('Seuls les paramètres startDate et endDate sont autorisés.');
    });

    it('should not throw if request or query is empty', async () => {
      const req = { query: {} };
      await controller.getPlanning(undefined, undefined, req);
      expect(service.getPlanning).toHaveBeenCalledWith(undefined, undefined);
    });
  });
});
