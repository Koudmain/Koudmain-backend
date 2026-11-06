import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { Request as ExpressRequest } from 'express';
import { ReviewController } from './review.controller';
import { ReviewService } from '@/modules/review/services/review.service';
import { PaymentReportType } from '@/modules/review/models/payment-report.model';
import { ROLES_KEY } from '@/decorators/roles.decorator';
import { UserRole } from '@/modules/users/models/user.model';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

describe('ReviewController', () => {
  let controller: ReviewController;
  let reflector: Reflector;

  const mockReviewService = {
    createCompanyReview: jest.fn(),
    createPaymentReport: jest.fn(),
  };

  const mockRequest = {
    user: { sub: 12, email: 'worker@koudmain.fr' },
  } as unknown as RequestWithUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewController],
      providers: [{ provide: ReviewService, useValue: mockReviewService }],
    }).compile();

    controller = module.get<ReviewController>(ReviewController);
    reflector = new Reflector();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('reviewCompany', () => {
    it('should require WORKER role metadata', () => {
      const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.reviewCompany);
      expect(roles).toEqual([UserRole.WORKER]);
    });

    it('should call ReviewService.createCompanyReview and return confirmation', async () => {
      mockReviewService.createCompanyReview.mockResolvedValue({ id: 7 });

      const dto = { rating: 5, comment: 'Super mission' };
      const result = await controller.reviewCompany(mockRequest, 100, dto);

      expect(mockReviewService.createCompanyReview).toHaveBeenCalledWith(12, 100, dto);
      expect(result).toEqual({ message: 'Merci pour votre avis', id: 7 });
    });
  });

  describe('reportPayment', () => {
    it('should require WORKER role metadata', () => {
      const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.reportPayment);
      expect(roles).toEqual([UserRole.WORKER]);
    });

    it('should call ReviewService.createPaymentReport and return confirmation', async () => {
      mockReviewService.createPaymentReport.mockResolvedValue({ id: 9 });

      const dto = {
        reportType: PaymentReportType.LATE_PAYMENT,
        description: 'Retard de paiement de 10 jours',
      };
      const result = await controller.reportPayment(mockRequest, 100, dto);

      expect(mockReviewService.createPaymentReport).toHaveBeenCalledWith(12, 100, dto);
      expect(result).toEqual({
        message: 'Votre signalement a été transmis à Koudmain',
        id: 9,
      });
    });
  });
});
