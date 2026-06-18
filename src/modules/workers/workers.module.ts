import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { WorkerTrade } from '@/modules/workers/models/worker-trade.model';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { WorkersController } from '@/modules/workers/controllers/workers.controller';

@Module({
  imports: [SequelizeModule.forFeature([WorkerProfile, WorkerTrade]), forwardRef(() => AuthModule)],
  controllers: [WorkersController],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
