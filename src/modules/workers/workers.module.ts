import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { WorkerProfile } from './models/worker-profile.model';
import { WorkersService } from './services/workers.service';

@Module({
  imports: [SequelizeModule.forFeature([WorkerProfile])],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
