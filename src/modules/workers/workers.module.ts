import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { WorkerJob } from '@/modules/workers/models/worker-job.model';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { WorkersController } from '@/modules/workers/controllers/workers.controller';

@Module({
  imports: [SequelizeModule.forFeature([WorkerProfile, WorkerJob]), forwardRef(() => AuthModule)],
  controllers: [WorkersController],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
