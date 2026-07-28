import {
  Column,
  Model,
  Table,
  DataType,
  BelongsTo,
  HasMany,
  BelongsToMany,
} from 'sequelize-typescript';
import { Company } from '@/modules/companies/models/company.model';
import { User } from '@/modules/users/models/user.model';
import { Application } from '@/modules/application/models/application.model';
import { Address } from '@/modules/address/address.model';
import { Skill } from '@/modules/skill/models/skill.model';
import { PublicationSkill } from './publication-skill.model';
import { IsArray, IsNumber, IsOptional, IsString, IsBoolean } from 'class-validator';

@Table({ tableName: 'publication', timestamps: false })
export class Publication extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ field: 'company_id', type: DataType.INTEGER })
  declare companyId: number;

  @BelongsTo(() => Company, 'company_id')
  declare company: Company;

  @Column({ field: 'created_by_user_id', type: DataType.INTEGER })
  declare createdByUserId: number;

  @BelongsTo(() => User, 'created_by_user_id')
  declare creator: User;

  @HasMany(() => Application, 'publication_id')
  declare applications: Application[];

  @BelongsToMany(() => Skill, () => PublicationSkill)
  declare skills?: Skill[];

  @Column({ type: DataType.INTEGER })
  declare address_id: number;

  @BelongsTo(() => Address, 'address_id')
  declare address: Address;

  @Column({ type: DataType.STRING })
  declare title: string;

  @Column({ type: DataType.TEXT })
  declare description: string;

  @Column({ type: DataType.DECIMAL(10, 2) })
  declare hourly_rate: number;

  @Column({ type: DataType.DATE })
  declare starting_date: Date;

  @Column({ type: DataType.DATE })
  declare ending_date: Date;

  @Column({ type: DataType.STRING })
  declare status: string;

  @Column({ type: DataType.BIGINT, defaultValue: 0 })
  declare views: number;

  @Column({ type: DataType.BIGINT, defaultValue: 0 })
  declare clicks: number;

  @Column({ field: 'created_at', type: DataType.DATE })
  declare createdAt: Date;

  @Column({ field: 'updated_at', type: DataType.DATE })
  declare updatedAt: Date;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PostPublicationDto {
  @ApiPropertyOptional({ example: 1, description: "ID de l'entreprise rattachée" })
  @IsOptional()
  @IsNumber()
  declare companyId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID du créateur' })
  @IsOptional()
  @IsNumber()
  declare createdByUserId?: number;

  @ApiPropertyOptional({ example: 1, description: "ID de l'adresse du lieu de travail" })
  @IsOptional()
  @IsNumber()
  declare address_id?: number;

  @ApiProperty({ example: 'Serveur de restaurant (H/F)', description: "Titre de l'offre" })
  @IsString()
  declare title: string;

  @ApiPropertyOptional({
    example: 'Recherche serveur expérimenté pour le service du soir.',
    description: 'Description détaillée',
  })
  @IsOptional()
  @IsString()
  declare description?: string;

  @ApiProperty({ example: 15.5, description: 'Taux horaire en Euros' })
  @IsNumber()
  declare hourly_rate: number;

  @ApiProperty({ example: '2026-08-01T09:00:00.000Z', description: 'Date et heure de début' })
  @IsString()
  declare starting_date: string;

  @ApiProperty({ example: '2026-08-01T17:00:00.000Z', description: 'Date et heure de fin' })
  @IsString()
  declare ending_date: string;

  @ApiPropertyOptional({ example: [1, 2, 3], description: 'Liste des IDs de compétences requises' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  declare skills?: number[];

  @ApiPropertyOptional({ example: false, description: 'Accepter automatiquement les candidatures' })
  @IsOptional()
  @IsBoolean()
  declare autoAccept?: boolean;

  @ApiPropertyOptional({ example: false, description: "Mettre en avant l'annonce" })
  @IsOptional()
  @IsBoolean()
  declare highlight?: boolean;
}

export class PostPublicationResponseDto {
  declare message: string;
  declare id: number;
  declare createdAt: Date;
}
