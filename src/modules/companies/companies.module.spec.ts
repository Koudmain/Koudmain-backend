import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { Module } from '@nestjs/common';
import { CompaniesModule } from './companies.module';
import { CompaniesService } from './services/companies.service';
import { CompaniesController } from './controllers/companies.controller';
import { Company } from './models/company.model';
import { CompanyMember } from './models/company-member.model';
import { CompanyTrade } from './models/company-trade.model';
import { Address } from '@/modules/address/address.model';

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
      .overrideProvider(getModelToken(CompanyTrade))
      .useValue({})
      .overrideProvider(getModelToken(Address))
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
