import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Review } from '@/modules/review/models/review.model';
import { PaymentReport } from '@/modules/review/models/payment-report.model';
import { ReviewService } from '@/modules/review/services/review.service';
import { ReviewController } from '@/modules/review/controllers/review.controller';
import { Mission } from '@/modules/mission/models/mission.model';
import { Company } from '@/modules/companies/models/company.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';

@Module({
  imports: [SequelizeModule.forFeature([Review, PaymentReport, Mission, Company, WorkerProfile])],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
