import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Company } from '@/modules/companies/models/company.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { CompanyJob } from '@/modules/companies/models/company-job.model';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { CompaniesController } from '@/modules/companies/controllers/companies.controller';
import { AuthModule } from '@/modules/auth/auth.module';
import { Address } from '@/modules/address/address.model';
import { GeocodingService } from '@/common/utils/geocoding/geocoding.service';
import { Publication } from '@/modules/publication/models/publication.model';
import { Application } from '@/modules/application/models/application.model';
import { Mission } from '@/modules/mission/models/mission.model';
import { Review } from '@/modules/review/models/review.model';
import { DriveModule } from '@/modules/drive/drive.module';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Company,
      CompanyMember,
      CompanyJob,
      Address,
      Publication,
      Application,
      Mission,
      Review,
    ]),
    forwardRef(() => AuthModule),
    DriveModule,
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService, GeocodingService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
