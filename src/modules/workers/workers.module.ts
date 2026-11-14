import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { WorkerJob } from '@/modules/workers/models/worker-job.model';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { WorkersController } from '@/modules/workers/controllers/workers.controller';
import { WorkerExperience } from '@/modules/workers/models/worker-experience.model';
import { WorkerFormation } from '@/modules/workers/models/worker-formation.model';
import { WorkerVerification } from '@/modules/workers/models/worker-verification.model';
import { Review } from '@/modules/review/models/review.model';
import { Application } from '@/modules/application/models/application.model';
import { Document } from '@/modules/document/models/document.model';
import { AddressModule } from '@/modules/address/address.module';

@Module({
  imports: [
    SequelizeModule.forFeature([
      WorkerProfile,
      WorkerJob,
      WorkerExperience,
      WorkerFormation,
      WorkerVerification,
      Review,
      Application,
      Document,
    ]),
    forwardRef(() => AuthModule),
    AddressModule,
  ],
  controllers: [WorkersController],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
