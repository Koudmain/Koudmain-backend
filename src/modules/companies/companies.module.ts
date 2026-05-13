import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Company } from './models/company.model';
import { CompanyMember } from './models/company-member.model';
import { CompaniesService } from './services/companies.service';
import { CompaniesController } from './controllers/companies.controller';
import { AuthModule } from '@/modules/auth/auth.module';
import { Address } from '@/modules/adress/adress.model';
import { GeocodingService } from '@/common/utils/geocoding.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Company, CompanyMember, Address]),
    forwardRef(() => AuthModule),
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService, GeocodingService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
