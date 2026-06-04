import { Test, TestingModule } from '@nestjs/testing';
import { PlanningModule } from '@/modules/planning/planning.module';
import { getConnectionToken, getModelToken } from '@nestjs/sequelize';
import { Publication } from '@/modules/publication/models/publication.model';
import { User } from '@/modules/users/models/user.model';
import { Company } from '@/modules/companies/models/company.model';
import { Application } from '@/modules/application/models/application.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { Review } from '@/modules/review/models/review.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { Address } from '@/modules/address/address.model';
import { PlanningController } from '@/modules/planning/controllers/planning.controller';
import { PlanningService } from '@/modules/planning/services/planning.service';

describe('PlanningModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [PlanningModule],
    })
      .overrideProvider(getConnectionToken())
      .useValue({ query: jest.fn() })
      .overrideProvider(getModelToken(Publication))
      .useValue({ create: jest.fn(), findAll: jest.fn() })
      .overrideProvider(getModelToken(User))
      .useValue({ create: jest.fn(), findAll: jest.fn() })
      .overrideProvider(getModelToken(Company))
      .useValue({ create: jest.fn(), findAll: jest.fn() })
      .overrideProvider(getModelToken(Application))
      .useValue({ create: jest.fn(), findAll: jest.fn() })
      .overrideProvider(getModelToken(WorkerProfile))
      .useValue({ create: jest.fn(), findAll: jest.fn() })
      .overrideProvider(getModelToken(Review))
      .useValue({ create: jest.fn(), findAll: jest.fn() })
      .overrideProvider(getModelToken(CompanyMember))
      .useValue({ create: jest.fn(), findAll: jest.fn(), findOne: jest.fn() })
      .overrideProvider(getModelToken(Address))
      .useValue({ create: jest.fn(), findAll: jest.fn() })
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should have Planning components', () => {
    expect(module.get(PlanningController)).toBeInstanceOf(PlanningController);
    expect(module.get(PlanningService)).toBeInstanceOf(PlanningService);
  });
});
