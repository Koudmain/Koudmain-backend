import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DeviceToken } from '@/modules/push/models/device-token.model';
import { DeviceTokenService } from '@/modules/push/services/device-token.service';
import { DeviceTokenController } from '@/modules/push/controllers/device-token.controller';

@Module({
  imports: [SequelizeModule.forFeature([DeviceToken])],
  controllers: [DeviceTokenController],
  providers: [DeviceTokenService],
  exports: [DeviceTokenService],
})
export class PushModule {}
