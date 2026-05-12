import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { WorkerProfile } from './models/worker-profile.model';
import { WorkersService } from './services/workers.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { WorkersController } from './controllers/workers.controller';

@Module({
  imports: [SequelizeModule.forFeature([WorkerProfile]), forwardRef(() => AuthModule)],
  controllers: [WorkersController],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
