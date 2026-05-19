import { forwardRef, Module } from '@nestjs/common';
import { AddressController } from './controllers/address.controller';
import { AddressService } from './address.service';
import { AuthModule } from '../auth/auth.module';
import { Address } from './address.model';
import { SequelizeModule } from '@nestjs/sequelize';

@Module({
  imports: [SequelizeModule.forFeature([Address]), forwardRef(() => AuthModule)],
  controllers: [AddressController],
  providers: [AddressService],
  exports: [AddressService],
})
export class AddressModule {}
