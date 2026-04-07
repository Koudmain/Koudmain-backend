import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PlanningController } from './controllers/planning.controller';
import { PlanningService } from './services/planning.service';
import { Publication } from '../publication/models/publication.model';
import { User } from '../users/models/user.model';
import { Company } from '../company/models/company.model';
import { Application } from '../application/models/application.model';
import { WorkerProfile } from '../worker-profile/models/worker-profile.model';
import { Review } from '../review/models/review.model';

@Module({
  imports: [SequelizeModule.forFeature([Publication, User, Company, Application, WorkerProfile, Review])],
  controllers: [PlanningController],
  providers: [PlanningService],
})
export class PlanningModule {}
