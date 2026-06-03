import { Table, Column, Model, DataType, BeforeSave } from 'sequelize-typescript';

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
  static handleGeom(instance: Address) {
    if (instance.latitude !== null && instance.longitude !== null) {
      instance.geom = {
        type: 'Point',
        coordinates: [Number(instance.longitude), Number(instance.latitude)],
      };
    }
  }
}
