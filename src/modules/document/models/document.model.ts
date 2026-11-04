import { Column, Model, Table, DataType } from 'sequelize-typescript';

@Table({ tableName: 'document', timestamps: false })
export class Document extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ field: 'file_path', type: DataType.STRING })
  declare filePath: string;

  @Column({ field: 'mime_type', type: DataType.STRING })
  declare mimeType: string;

  @Column({ field: 'size_bytes', type: DataType.INTEGER })
  declare sizeBytes: number;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;
}
