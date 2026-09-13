import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvoiceCompanyDto {
  @ApiProperty({ description: 'Nom de la société / personne', example: 'Koudmain SAS' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Adresse postale', example: "10 Rue de l'Innovation, 75001 Paris" })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ description: 'Numéro SIRET', example: '123 456 789 00012' })
  @IsString()
  @IsOptional()
  siret?: string;

  @ApiPropertyOptional({ description: 'Adresse email de contact', example: 'contact@koudmain.fr' })
  @IsString()
  @IsOptional()
  email?: string;
}

export class InvoiceItemDto {
  @ApiProperty({
    description: 'Description de la prestation / produit',
    example: 'Service en salle (5.5h)',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Quantité', example: 1 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Prix unitaire HT', example: 85.25 })
  @IsNumber()
  unitPriceHt: number;

  @ApiProperty({ description: 'Total HT de la ligne', example: 85.25 })
  @IsNumber()
  totalHt: number;
}

export class InvoiceDataDto {
  @ApiProperty({ description: 'Numéro de la facture', example: 'INV-2026-001' })
  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @ApiProperty({ description: "Date d'émission", example: '28/07/2026' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({ description: "Date d'échéance", example: '15/08/2026' })
  @IsString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({ type: () => InvoiceCompanyDto, description: 'Émetteur de la facture' })
  @IsObject()
  @ValidateNested()
  @Type(() => InvoiceCompanyDto)
  issuer: InvoiceCompanyDto;

  @ApiProperty({ type: () => InvoiceCompanyDto, description: 'Client de la facture' })
  @IsObject()
  @ValidateNested()
  @Type(() => InvoiceCompanyDto)
  client: InvoiceCompanyDto;

  @ApiProperty({ type: () => [InvoiceItemDto], description: 'Liste des lignes de la facture' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @ApiProperty({ description: 'Montant total Hors Taxes', example: 85.25 })
  @IsNumber()
  totalHt: number;

  @ApiProperty({ description: 'Montant TVA', example: 17.05 })
  @IsNumber()
  tvaAmount: number;

  @ApiProperty({ description: 'Montant total TTC', example: 102.3 })
  @IsNumber()
  totalTtc: number;
}
