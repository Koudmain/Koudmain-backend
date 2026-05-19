import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Address } from './address.model';
import { CreateAddressDto } from './address.dto';

@Injectable()
export class AddressService {
  constructor(@InjectModel(Address) private readonly addressModel: typeof Address) {}

  async createAddress(userId: number, body: CreateAddressDto) {
    const completeAddress = `${body.street_number} ${body.street_name}, ${body.zip_code} ${body.city}, ${body.country}`;
    const address = await this.addressModel.create({
      ...body,
      user_id: userId,
      complete_address: completeAddress,
    });

    return address;
  }
}
