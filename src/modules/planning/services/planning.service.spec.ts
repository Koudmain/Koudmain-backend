import { Test, TestingModule } from '@nestjs/testing';
import { PlanningService } from '@/modules/planning/services/planning.service';
import { getModelToken } from '@nestjs/sequelize';
import { Publication } from '@/modules/publication/models/publication.model';
import { User } from '@/modules/users/models/user.model';
import { Application } from '@/modules/application/models/application.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { Company } from '@/modules/companies/models/company.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { Review } from '@/modules/review/models/review.model';
import { Address } from '@/modules/address/address.model';
import { BadRequestException } from '@nestjs/common';
import { Op } from 'sequelize';

describe('PlanningService', () => {
  let service: PlanningService;
  let applicationModelMock: typeof Application;

  const mockPublicationModel = {};

  const mockApplicationModel = {
    findAll: jest.fn().mockResolvedValue([]),
  };

  const mockCompanyMemberModel = {
    findOne: jest.fn().mockResolvedValue({ id: 1, user_id: 1, company_id: 10 }),
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
        {
          provide: getModelToken(Application),
          useValue: mockApplicationModel,
        },
        {
          provide: getModelToken(CompanyMember),
          useValue: mockCompanyMemberModel,
        },
      ],
    }).compile();

    service = module.get<PlanningService>(PlanningService);
    applicationModelMock = module.get(getModelToken(Application));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPlanning', () => {
    const user_id = 1;

    it('should call findAll with default dates (-1 month to +2 months) if no arguments provided', async () => {
      const mock_date = new Date('2026-03-15T12:00:00Z');
      jest.useFakeTimers().setSystemTime(mock_date);

      const expected_start = new Date(mock_date.getFullYear(), mock_date.getMonth() - 1, 1);
      const expected_end = new Date(
        mock_date.getFullYear(),
        mock_date.getMonth() + 2,
        0,
        23,
        59,
        59,
        999,
      );

      await service.getPlanning(user_id, 'worker');

      expect(mockApplicationModel.findAll).toHaveBeenCalledWith({
        include: [
          {
            model: WorkerProfile,
            as: 'workerProfile',
            where: { user_id: user_id },
            required: true,
          },
          {
            model: Publication,
            as: 'publication',
            required: true,
            where: {
              starting_date: {
                [Op.lte]: expected_end,
              },
              ending_date: {
                [Op.gte]: expected_start,
              },
            },
            include: [
              {
                model: Address,
                as: 'address',
                required: false,
              },
              {
                model: Company,
                as: 'company',
                required: false,
              },
              {
                model: User,
                as: 'creator',
                required: false,
                include: [
                  {
                    model: Review,
                    as: 'reviews',
                    required: false,
                  },
                ],
              },
            ],
          },
        ],
        order: [['publication', 'starting_date', 'ASC']],
      });

      jest.useRealTimers();
    });

    it('should call findAll with specific requested dates', async () => {
      const start_date = '2026-05-01';
      const end_date = '2026-05-15';
      await service.getPlanning(user_id, 'worker', start_date, end_date);

      expect(mockApplicationModel.findAll).toHaveBeenCalledWith({
        include: [
          {
            model: WorkerProfile,
            as: 'workerProfile',
            where: { user_id: user_id },
            required: true,
          },
          {
            model: Publication,
            as: 'publication',
            required: true,
            where: {
              starting_date: {
                [Op.lte]: new Date(end_date),
              },
              ending_date: {
                [Op.gte]: new Date(start_date),
              },
            },
            include: [
              {
                model: Address,
                as: 'address',
                required: false,
              },
              {
                model: Company,
                as: 'company',
                required: false,
              },
              {
                model: User,
                as: 'creator',
                required: false,
                include: [
                  {
                    model: Review,
                    as: 'reviews',
                    required: false,
                  },
                ],
              },
            ],
          },
        ],
        order: [['publication', 'starting_date', 'ASC']],
      });
    });

    it('should throw BadRequestException for employer planning without activeCompanyId', async () => {
      await expect(
        service.getPlanning(user_id, 'employer', '2026-03-01', '2026-03-31'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if only startDate is provided', async () => {
      await expect(service.getPlanning(user_id, 'worker', '2026-03-01', undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if only endDate is provided', async () => {
      await expect(service.getPlanning(user_id, 'worker', undefined, '2026-03-31')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if startDate format is invalid', async () => {
      await expect(
        service.getPlanning(user_id, 'worker', 'invalid-date', '2026-03-31'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if endDate format is invalid', async () => {
      await expect(
        service.getPlanning(user_id, 'worker', '2026-03-01', 'not-a-date'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should map returned applications properly', async () => {
      const mock_application_data = [
        {
          status: 'PENDING',
          publication: {
            id: 10,
            title: 'Test Pub',
            hourly_rate: 20,
            starting_date: new Date('2026-05-10'),
            ending_date: new Date('2026-05-12'),
            company: { name: 'Test Company' },
            creator: {
              profile_picture_url: 'http://example.com/pic.jpg',
              reviews: [{ rating: 4 }, { rating: 5 }],
            },
          },
        },
        {
          status: 'ACCEPTED',
          publication: {
            id: 20,
            title: 'Test Pub 2',
            hourly_rate: 30,
            starting_date: new Date('2026-05-15'),
            ending_date: new Date('2026-05-16'),
            company: null,
            creator: null,
          },
        },
      ];

      jest
        .spyOn(applicationModelMock, 'findAll')
        .mockResolvedValueOnce(mock_application_data as unknown as Application[]);

      const result = await service.getPlanning(user_id, 'worker', '2026-05-01', '2026-05-31');

      expect(result).toEqual([
        {
          publication_id: 10,
          title: 'Test Pub',
          salary: 20,
          starting_date: new Date('2026-05-10'),
          ending_date: new Date('2026-05-12'),
          company_name: 'Test Company',
          company_rating: 4.5,
          company_rating_count: 2,
          company_logo: 'http://example.com/pic.jpg',
          application_status: 'PENDING',
          city: null,
          zip: null,
        },
        {
          publication_id: 20,
          title: 'Test Pub 2',
          salary: 30,
          starting_date: new Date('2026-05-15'),
          ending_date: new Date('2026-05-16'),
          company_name: null,
          company_rating: 0,
          company_rating_count: 0,
          company_logo: null,
          application_status: 'ACCEPTED',
          city: null,
          zip: null,
        },
      ]);
    });
  });
});
