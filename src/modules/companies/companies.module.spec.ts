import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { Module } from '@nestjs/common';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { CompaniesController } from '@/modules/companies/controllers/companies.controller';
import { Company } from '@/modules/companies/models/company.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { CompanyJob } from '@/modules/companies/models/company-job.model';
import { Address } from '@/modules/address/address.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { Application } from '@/modules/application/models/application.model';
import { Mission } from '@/modules/mission/models/mission.model';
import { Review } from '@/modules/review/models/review.model';
import { DriveService } from '@/modules/drive/drive.service';

jest.mock('@/modules/auth/auth.module', () => {
  @Module({})
  class InlineAuthModule {}

  return {
    AuthModule: InlineAuthModule,
  };
});

describe('CompaniesModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [CompaniesModule],
    })
      .overrideProvider(getModelToken(Company))
      .useValue({})
      .overrideProvider(getModelToken(CompanyMember))
      .useValue({})
      .overrideProvider(getModelToken(CompanyJob))
      .useValue({})
      .overrideProvider(getModelToken(Address))
      .useValue({})
      .overrideProvider(getModelToken(Publication))
      .useValue({})
      .overrideProvider(getModelToken(Application))
      .useValue({})
      .overrideProvider(getModelToken(Mission))
      .useValue({})
      .overrideProvider(getModelToken(Review))
      .useValue({})
      .overrideProvider(DriveService)
      .useValue({})
      .compile();
  });

  it('le module doit être défini et charger correctement ses composants', () => {
    expect(moduleRef).toBeDefined();

    const service = moduleRef.get<CompaniesService>(CompaniesService);
    const controller = moduleRef.get<CompaniesController>(CompaniesController);

    expect(service).toBeInstanceOf(CompaniesService);
    expect(controller).toBeInstanceOf(CompaniesController);
  });
});
