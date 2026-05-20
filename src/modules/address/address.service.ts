import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Address } from './address.model';
import { CreateAddressDto, GetMapAddressesDto } from './address.dto';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address) private readonly addressModel: typeof Address,
    private readonly sequelize: Sequelize,
  ) {}

  async createAddress(userId: number, body: CreateAddressDto) {
    const completeAddress = `${body.street_number} ${body.street_name}, ${body.zip_code} ${body.city}, ${body.country}`;
    const address = await this.addressModel.create({
      ...body,
      user_id: userId,
      complete_address: completeAddress,
    });

    return address;
  }

  async getAddressesInZone(dto: GetMapAddressesDto) {
    const { min_lat, max_lat, min_lng, max_lng } = dto;

    const query = `
      SELECT id, latitude, longitude
      FROM "address"
      WHERE geom && ST_MakeEnvelope(:min_lng, :min_lat, :max_lng, :max_lat, 4326)
      LIMIT 300
    `;

    return this.sequelize.query(query, {
      replacements: { min_lat, max_lat, min_lng, max_lng },
      type: 'SELECT',
    });
  }
}
