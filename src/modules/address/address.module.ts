import { forwardRef, Module } from '@nestjs/common';
import { AddressController } from './controllers/address.controller';
import { AddressService } from './services/address.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { Address } from './address.model';
import { SequelizeModule } from '@nestjs/sequelize';

@Module({
  imports: [SequelizeModule.forFeature([Address]), forwardRef(() => AuthModule)],
  controllers: [AddressController],
  providers: [AddressService],
  exports: [AddressService],
})
export class AddressModule {}
