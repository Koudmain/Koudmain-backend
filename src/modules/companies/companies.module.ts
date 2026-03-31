import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Company } from './models/company.model';
import { CompanyMember } from './models/company-member.model';
import { CompaniesService } from './services/companies.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Company, CompanyMember]),
  ],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}