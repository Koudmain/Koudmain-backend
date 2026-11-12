import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { Address } from '@/modules/address/address.model';
import { GetMapAddressesDto, UpdateCompanyAddressDto } from '@/modules/address/address.dto';
import { Sequelize } from 'sequelize-typescript';
import { GeocodingService } from '@/common/utils/geocoding/geocoding.service';
import { OPEN_PUBLICATION_STATUSES } from '@/modules/publication/models/publication.model';

// Postal fields shared by every address form (registration, worker profile, company).
export type AddressInput = UpdateCompanyAddressDto;

export type AddressAttributes = {
  street_number?: string;
  street_name: string;
  zip_code: string;
  city: string;
  country: string;
  full_address: string;
  latitude: number | null;
  longitude: number | null;
};

const DEFAULT_COUNTRY = 'France';

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address) private readonly addressModel: typeof Address,
    private readonly geoService: GeocodingService,
    private readonly sequelize: Sequelize,
  ) {}

  async createAddress(body: AddressInput, options?: { transaction?: Transaction }) {
    return this.addressModel.create(await this.buildAttributes(body), {
      transaction: options?.transaction,
    });
  }

  async updateAddress(addressId: number, body: AddressInput) {
    const address = await this.addressModel.findByPk(addressId);
    if (!address) throw new NotFoundException('Adresse introuvable');

    return address.update(await this.buildAttributes(body));
  }

  // Makes an HTTP call (geocoding): call it before opening a DB transaction.
  // An address that cannot be geocoded is still saved, without coordinates.
  async buildAttributes(body: AddressInput): Promise<AddressAttributes> {
    const country = body.country || DEFAULT_COUNTRY;
    const fullAddress =
      `${body.streetNumber || ''} ${body.streetName}, ${body.zipCode} ${body.city}, ${country}`.trim();
    const coords = await this.geoService.getCoordsFromAddress(fullAddress);

    return {
      street_number: body.streetNumber,
      street_name: body.streetName,
      zip_code: body.zipCode,
      city: body.city,
      country,
      full_address: fullAddress,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
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
