import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCompanyAddressDto {
  @ApiPropertyOptional({ example: '12' })
  @IsString()
  @IsOptional()
  streetNumber?: string;

  @ApiProperty({ example: 'Rue de la Paix' })
  @IsString()
  @IsNotEmpty()
  streetName: string;

  @ApiProperty({ example: '75002' })
  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @ApiProperty({ example: 'Paris' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ example: 'France' })
  @IsString()
  @IsOptional()
  country?: string;
}

export class CreateAddressDto {
  @ApiPropertyOptional({ example: '12' })
  @IsString()
  @IsOptional()
  streetNumber?: string;

  @ApiProperty({ example: 'Rue de la Paix' })
  @IsString()
  @IsNotEmpty()
  streetName: string;

  @ApiProperty({ example: '75002' })
  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @ApiProperty({ example: 'Paris' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ example: 'France' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: 48.8688 })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 2.3314 })
  @IsNumber()
  @IsOptional()
  longitude?: number;
}

export class GetMapAddressesDto {
  @ApiProperty({ example: 45.7, description: 'Latitude minimale' })
  @Type(() => Number)
  @IsLatitude()
  minLat: number;

  @ApiProperty({ example: 45.8, description: 'Latitude maximale' })
  @Type(() => Number)
  @IsLatitude()
  maxLat: number;

  @ApiProperty({ example: 4.8, description: 'Longitude minimale' })
  @Type(() => Number)
  @IsLongitude()
  minLng: number;

  @ApiProperty({ example: 4.9, description: 'Longitude maximale' })
  @Type(() => Number)
  @IsLongitude()
  maxLng: number;
}
