import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PlanningController } from '@/modules/planning/controllers/planning.controller';
import { PlanningService } from '@/modules/planning/services/planning.service';
import { Publication } from '@/modules/publication/models/publication.model';
import { User } from '@/modules/users/models/user.model';
import { Company } from '@/modules/companies/models/company.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { Application } from '@/modules/application/models/application.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { Review } from '@/modules/review/models/review.model';
import { Address } from '@/modules/publication/models/address.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Publication,
      User,
      Company,
      CompanyMember,
      Application,
      WorkerProfile,
      Review,
      Address,
    ]),
  ],
  controllers: [PlanningController],
  providers: [PlanningService],
})
export class PlanningModule {}
