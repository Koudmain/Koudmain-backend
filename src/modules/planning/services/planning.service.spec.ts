import { Test, TestingModule } from '@nestjs/testing';
import { PlanningService } from './planning.service';
import { getModelToken } from '@nestjs/sequelize';
import { Publication } from '../../publication/models/publication.model';
import { User } from '../../users/models/user.model';
import { BadRequestException } from '@nestjs/common';
import { Op, Sequelize } from 'sequelize';

describe('PlanningService', () => {
  let service: PlanningService;
  let model: any;
  let userModel: any;

  const mockPublicationModel = {
    findAll: jest.fn().mockResolvedValue([]),
  };

  const mockUserModel = {
    findByPk: jest.fn().mockResolvedValue({ id: 1, is_worker_active: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanningService,
        {
          provide: getModelToken(Publication),
          useValue: mockPublicationModel,
        },
        {
          provide: getModelToken(User),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<PlanningService>(PlanningService);
    model = module.get(getModelToken(Publication));
    userModel = module.get(getModelToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPlanning', () => {
    const userId = 1;

    it('should call findAll with default dates (-1 month to +2 months) if no arguments provided', async () => {
      const mockDate = new Date('2026-03-15T12:00:00Z');
      jest.useFakeTimers().setSystemTime(mockDate);

      const expectedStart = new Date(mockDate.getFullYear(), mockDate.getMonth() - 1, 1);
      const expectedEnd = new Date(mockDate.getFullYear(), mockDate.getMonth() + 2, 0, 23, 59, 59, 999);

      await service.getPlanning(userId);

      expect(model.findAll).toHaveBeenCalledWith({
        attributes: expect.any(Array),
        where: {
          starting_date: {
            [Op.lte]: expectedEnd,
          },
          ending_date: {
            [Op.gte]: expectedStart,
          },
          id: {
            [Op.in]: expect.anything(),
          }
        },
        order: [['starting_date', 'ASC']],
      });

      jest.useRealTimers();
    });

    it('should call findAll with specific requested dates', async () => {
      const startDate = '2026-05-01';
      const endDate = '2026-05-15';
      await service.getPlanning(userId, startDate, endDate);

      expect(model.findAll).toHaveBeenCalledWith({
        attributes: expect.any(Array),
        where: {
          starting_date: {
            [Op.lte]: new Date(endDate),
          },
          ending_date: {
            [Op.gte]: new Date(startDate),
          },
          id: {
            [Op.in]: expect.anything(),
          }
        },
        order: [['starting_date', 'ASC']],
      });
    });

    it('should throw BadRequestException if only startDate is provided', async () => {
      await expect(service.getPlanning(userId, '2026-03-01', undefined))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw BadRequestException if only endDate is provided', async () => {
      await expect(service.getPlanning(userId, undefined, '2026-03-31'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw BadRequestException if startDate format is invalid', async () => {
      await expect(service.getPlanning(userId, 'invalid-date', '2026-03-31'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw BadRequestException if endDate format is invalid', async () => {
      await expect(service.getPlanning(userId, '2026-03-01', 'not-a-date'))
        .rejects
        .toThrow(BadRequestException);
    });
  });
});
