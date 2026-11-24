import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { ReviewModule } from '@/modules/review/review.module';
import { ReviewService } from '@/modules/review/services/review.service';
import { ReviewController } from '@/modules/review/controllers/review.controller';
import { Review } from '@/modules/review/models/review.model';
import { PaymentReport } from '@/modules/review/models/payment-report.model';
import { Mission } from '@/modules/mission/models/mission.model';
import { Company } from '@/modules/companies/models/company.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';

describe('ReviewModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ReviewModule],
    })
      .overrideProvider(getModelToken(Review))
      .useValue({})
      .overrideProvider(getModelToken(PaymentReport))
      .useValue({})
      .overrideProvider(getModelToken(Mission))
      .useValue({})
      .overrideProvider(getModelToken(Company))
      .useValue({})
      .overrideProvider(getModelToken(WorkerProfile))
      .useValue({})
      .compile();
  });

  it('should be defined and load its components', () => {
    expect(moduleRef).toBeDefined();

    const service = moduleRef.get<ReviewService>(ReviewService);
    const controller = moduleRef.get<ReviewController>(ReviewController);

    expect(service).toBeInstanceOf(ReviewService);
    expect(controller).toBeInstanceOf(ReviewController);
  });
});
