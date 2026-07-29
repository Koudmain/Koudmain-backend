import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
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
  @ApiProperty({ example: '48.80' })
  @IsString()
  @IsNotEmpty()
  minLat: string;

  @ApiProperty({ example: '48.90' })
  @IsString()
  @IsNotEmpty()
  maxLat: string;

  @ApiProperty({ example: '2.20' })
  @IsString()
  @IsNotEmpty()
  minLng: string;

  @ApiProperty({ example: '2.40' })
  @IsString()
  @IsNotEmpty()
  maxLng: string;
}
