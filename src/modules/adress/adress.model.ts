import { Table, Column, Model, DataType, BeforeSave } from 'sequelize-typescript';
import { GeocodingService } from '@/common/utils/geocoding.service';

@Table({ tableName: 'address', timestamps: false })
export class Address extends Model {
  @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
  declare id: number;

  @Column(DataType.STRING(10))
  declare street_number: string;

  @Column(DataType.STRING(255))
  declare street_name: string;

  @Column(DataType.STRING(10))
  declare zip_code: string;

  @Column(DataType.STRING(100))
  declare city: string;

  @Column({ type: DataType.STRING(100), defaultValue: 'France' })
  declare country: string;

  @Column(DataType.DECIMAL(9, 6))
  declare latitude: number;

  @Column(DataType.DECIMAL(9, 6))
  declare longitude: number;

  @Column(DataType.TEXT)
  declare full_address: string;

  @Column({
    type: DataType.GEOMETRY('POINT', 4326),
  })
  declare geom: { type: string; coordinates: [number, number] };

  @BeforeSave
  static async handleGeocoding(instance: Address) {
    if (
      instance.changed('street_name') ||
      instance.changed('city') ||
      instance.changed('zip_code')
    ) {
      const geoService = new GeocodingService();
      const fullAddress = `${instance.street_number} ${instance.street_name}, ${instance.zip_code} ${instance.city}`;

      const coords = await geoService.getCoordsFromAddress(fullAddress);

      if (coords) {
        instance.latitude = coords.latitude;
        instance.longitude = coords.longitude;
        instance.geom = {
          type: 'Point',
          coordinates: [coords.longitude, coords.latitude],
        };
      }
    }
  }
}
