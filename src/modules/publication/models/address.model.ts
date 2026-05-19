import { Column, Model, Table, DataType } from 'sequelize-typescript';

@Table({ tableName: 'address', timestamps: false })
export class Address extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING })
  declare street_number: string;

  @Column({ type: DataType.STRING })
  declare street_name: string;

  @Column({ type: DataType.STRING(10) })
  declare zip_code: string;

  @Column({ type: DataType.STRING(100) })
  declare city: string;

  @Column({ type: DataType.STRING })
  declare country: string;

  @Column({ type: DataType.FLOAT })
  declare latitude: number;

  @Column({ type: DataType.FLOAT })
  declare longitude: number;

  @Column({ type: DataType.TEXT })
  declare full_address: string;
}
