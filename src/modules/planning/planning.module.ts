import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PlanningController } from './controllers/planning.controller';
import { PlanningService } from './services/planning.service';
import { Publication } from '../publication/models/publication.model';
import { User } from '../users/models/user.model';

@Module({
  imports: [SequelizeModule.forFeature([Publication, User])],
  controllers: [PlanningController],
  providers: [PlanningService],
})
export class PlanningModule {}
