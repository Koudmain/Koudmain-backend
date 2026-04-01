import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Company } from './models/company.model';
import { CompanyMember } from './models/company-member.model';
import { CompaniesService } from './services/companies.service';
import { CompaniesController } from './companies.controller';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Company, CompanyMember]),
    forwardRef(() => AuthModule)
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}