import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Address } from '@/modules/address/address.model';
import { CreateAddressDto, GetMapAddressesDto } from '@/modules/address/address.dto';
import { Sequelize } from 'sequelize-typescript';
import { GeocodingService } from '@/common/utils/geocoding/geocoding.service';

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address) private readonly addressModel: typeof Address,
    private readonly geoService: GeocodingService,
    private readonly sequelize: Sequelize,
  ) {}

  async createAddress(body: CreateAddressDto) {
    const country = body.country || 'France';
    const fullAddress =
      `${body.street_number || ''} ${body.street_name}, ${body.zip_code} ${body.city}, ${country}`.trim();

    let latitude: number | null = null;
    let longitude: number | null = null;

    try {
      const coords = await this.geoService.getCoordsFromAddress(fullAddress);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    } catch (error) {
      throw new InternalServerErrorException(`Géocodage impossible pour cette adresse`, {
        cause: error,
      });
    }

    const address = await this.addressModel.create({
      ...body,
      full_address: fullAddress,
      latitude,
      longitude,
    });

    return address;
  }

  async getAddressesInZone(dto: GetMapAddressesDto) {
    const { minLat, maxLat, minLng, maxLng } = dto;

    const query = `
      SELECT id, latitude, longitude
      FROM "address"
      WHERE geom && ST_MakeEnvelope(:minLng, :minLat, :maxLng, :maxLat, 4326)
      LIMIT 300
    `;

    return this.sequelize.query(query, {
      replacements: { minLat, maxLat, minLng, maxLng },
      type: 'SELECT',
    });
  }
}
