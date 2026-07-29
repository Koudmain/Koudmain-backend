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

export class InvoiceCompanyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  siret?: string;

  @IsString()
  @IsOptional()
  email?: string;
}

export class InvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPriceHt: number;

  @IsNumber()
  totalHt: number;
}

export class InvoiceDataDto {
  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  dueDate?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => InvoiceCompanyDto)
  issuer: InvoiceCompanyDto;

  @IsObject()
  @ValidateNested()
  @Type(() => InvoiceCompanyDto)
  client: InvoiceCompanyDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @IsNumber()
  totalHt: number;

  @IsNumber()
  tvaAmount: number;

  @IsNumber()
  totalTtc: number;
}
