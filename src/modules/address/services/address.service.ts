import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Address } from '@/modules/address/address.model';
import { CreateAddressDto, GetMapAddressesDto } from '@/modules/address/address.dto';
import { Sequelize } from 'sequelize-typescript';
import { GeocodingService } from '@/common/utils/geocoding/geocoding.service';
import { OPEN_PUBLICATION_STATUSES } from '@/modules/companies/services/companies.service';

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address) private readonly addressModel: typeof Address,
    private readonly geoService: GeocodingService,
    private readonly sequelize: Sequelize,
  ) {}

  async createAddress(body: CreateAddressDto) {
    return this.addressModel.create(await this.buildAddressAttributes(body));
  }

  async updateAddress(addressId: number, body: CreateAddressDto) {
    const address = await this.addressModel.findByPk(addressId);
    if (!address) throw new NotFoundException('Adresse introuvable');

    return address.update(await this.buildAddressAttributes(body));
  }

  private async buildAddressAttributes(body: CreateAddressDto) {
    const country = body.country || 'France';
    const fullAddress =
      `${body.streetNumber || ''} ${body.streetName}, ${body.zipCode} ${body.city}, ${country}`.trim();

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

    return {
      street_number: body.streetNumber,
      street_name: body.streetName,
      zip_code: body.zipCode,
      city: body.city,
      country: body.country,
      full_address: fullAddress,
      latitude,
      longitude,
    };
  }

  async getPublicationsInZone(dto: GetMapAddressesDto) {
    const { minLat, maxLat, minLng, maxLng } = dto;

    const query = `
      SELECT p.id, a.latitude::float AS latitude, a.longitude::float AS longitude
      FROM "publication" p
      JOIN "company" c ON c.id = p.company_id
      JOIN "address" a ON a.id = COALESCE(p.address_id, c.address_id)
      WHERE p.status IN (:statuses)
        AND a.geom && ST_MakeEnvelope(:minLng, :minLat, :maxLng, :maxLat, 4326)
      LIMIT 300
    `;

    return this.sequelize.query(query, {
      replacements: { minLat, maxLat, minLng, maxLng, statuses: OPEN_PUBLICATION_STATUSES },
      type: 'SELECT',
    });
  }
}
