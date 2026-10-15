import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ReviewService } from '@/modules/review/services/review.service';
import { Review, ReviewType } from '@/modules/review/models/review.model';
import { PaymentReport, PaymentReportType } from '@/modules/review/models/payment-report.model';
import { Mission } from '@/modules/mission/models/mission.model';
import { Company } from '@/modules/companies/models/company.model';

describe('ReviewService', () => {
  let service: ReviewService;

  const mockReviewModel = {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  };

  const mockPaymentReportModel = {
    create: jest.fn(),
  };

  const mockMissionModel = {
    findOne: jest.fn(),
  };

  const mockCompanyModel = {
    update: jest.fn(),
  };

  const userId = 42;
  const missionId = 7;
  const mission = { id: missionId, companyId: 3 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: getModelToken(Review), useValue: mockReviewModel },
        { provide: getModelToken(PaymentReport), useValue: mockPaymentReportModel },
        { provide: getModelToken(Mission), useValue: mockMissionModel },
        { provide: getModelToken(Company), useValue: mockCompanyModel },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);

    jest.clearAllMocks();
  });

  describe('createCompanyReview', () => {
    it('should throw NotFoundException when the mission is not completed or does not belong to the worker', async () => {
      mockMissionModel.findOne.mockResolvedValue(null);

      await expect(service.createCompanyReview(userId, missionId, { rating: 5 })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockReviewModel.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when a review already exists for this mission', async () => {
      mockMissionModel.findOne.mockResolvedValue(mission);
      mockReviewModel.findOne.mockResolvedValue({ id: 1 });

      await expect(service.createCompanyReview(userId, missionId, { rating: 5 })).rejects.toThrow(
        ConflictException,
      );
      expect(mockReviewModel.create).not.toHaveBeenCalled();
    });

    it('should create the review and update the company rating', async () => {
      mockMissionModel.findOne.mockResolvedValue(mission);
      mockReviewModel.findOne.mockResolvedValue(null);
      mockReviewModel.create.mockResolvedValue({ id: 12 });
      mockReviewModel.findAll.mockResolvedValue([{ rating: 5 }, { rating: 4 }]);

      const result = await service.createCompanyReview(userId, missionId, {
        rating: 4,
        comment: '  Bonne ambiance  ',
        paymentOnTime: true,
      });

      expect(mockReviewModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          missionId,
          reviewerId: userId,
          ratedCompanyId: 3,
          rating: 4,
          comment: 'Bonne ambiance',
          type: ReviewType.WORKER_TO_COMPANY,
          paymentOnTime: true,
          missionMatchesListing: null,
        }),
      );
      expect(mockCompanyModel.update).toHaveBeenCalledWith(
        { averageRating: 4.5, reviewCount: 2 },
        { where: { id: 3 } },
      );
      expect(result).toEqual({ id: 12 });
    });
  });

  describe('createPaymentReport', () => {
    it('should throw NotFoundException when the mission is not completed', async () => {
      mockMissionModel.findOne.mockResolvedValue(null);

      await expect(
        service.createPaymentReport(userId, missionId, {
          reportType: PaymentReportType.NO_PAYMENT,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should create a report linked to the mission's company", async () => {
      mockMissionModel.findOne.mockResolvedValue(mission);
      mockPaymentReportModel.create.mockResolvedValue({ id: 5 });

      await service.createPaymentReport(userId, missionId, {
        reportType: PaymentReportType.LATE_PAYMENT,
        description: 'Payé avec 10 jours de retard',
      });

      expect(mockPaymentReportModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          missionId,
          reporterId: userId,
          companyId: 3,
          reportType: PaymentReportType.LATE_PAYMENT,
          description: 'Payé avec 10 jours de retard',
        }),
      );
    });
  });
});
