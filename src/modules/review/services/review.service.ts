import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Review, ReviewType } from '@/modules/review/models/review.model';
import { PaymentReport } from '@/modules/review/models/payment-report.model';
import { Mission, MissionStatus } from '@/modules/mission/models/mission.model';
import { Company } from '@/modules/companies/models/company.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { CreateCompanyReviewDto, CreatePaymentReportDto } from '@/modules/review/dto/review.dto';
import { buildRatingSummary } from '@/modules/review/review.utils';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review) private reviewModel: typeof Review,
    @InjectModel(PaymentReport) private paymentReportModel: typeof PaymentReport,
    @InjectModel(Mission) private missionModel: typeof Mission,
    @InjectModel(Company) private companyModel: typeof Company,
  ) {}

  async createCompanyReview(userId: number, missionId: number, dto: CreateCompanyReviewDto) {
    const mission = await this.getCompletedMissionOfWorker(userId, missionId);

    const existingReview = await this.reviewModel.findOne({
      where: { missionId, reviewerId: userId, type: ReviewType.WORKER_TO_COMPANY },
    });

    if (existingReview) {
      throw new ConflictException('Un avis a déjà été déposé pour cette mission');
    }

    const review = await this.reviewModel.create({
      missionId,
      reviewerId: userId,
      ratedCompanyId: mission.companyId,
      rating: dto.rating,
      comment: dto.comment?.trim() || null,
      type: ReviewType.WORKER_TO_COMPANY,
      paymentOnTime: dto.paymentOnTime ?? null,
      missionMatchesListing: dto.missionMatchesListing ?? null,
      createdAt: new Date(),
    });

    await this.refreshCompanyRating(mission.companyId);

    return review;
  }

  async createPaymentReport(userId: number, missionId: number, dto: CreatePaymentReportDto) {
    const mission = await this.getCompletedMissionOfWorker(userId, missionId);

    return this.paymentReportModel.create({
      missionId,
      reporterId: userId,
      companyId: mission.companyId,
      reportType: dto.reportType,
      description: dto.description?.trim() || null,
      createdAt: new Date(),
    });
  }

  private async getCompletedMissionOfWorker(userId: number, missionId: number) {
    const mission = await this.missionModel.findOne({
      where: { id: missionId, status: MissionStatus.COMPLETED },
      include: [
        {
          model: WorkerProfile,
          as: 'worker',
          where: { userId },
          required: true,
          attributes: ['id'],
        },
      ],
    });

    if (!mission) {
      throw new NotFoundException('Mission terminée introuvable');
    }

    return mission;
  }

  private async refreshCompanyRating(companyId: number) {
    const reviews = await this.reviewModel.findAll({
      where: { ratedCompanyId: companyId },
      attributes: ['rating'],
    });
    const { average, count } = buildRatingSummary(reviews);

    await this.companyModel.update(
      { averageRating: average, reviewCount: count },
      { where: { id: companyId } },
    );
  }
}
