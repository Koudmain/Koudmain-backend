import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class UpdateCompanyAddressDto {
  @IsString()
  @IsOptional()
  streetNumber: string;

  @IsString()
  @IsNotEmpty()
  streetName: string;

  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsOptional()
  country: string;
}

export class CreateAddressDto {
  @IsString()
  @IsOptional()
  streetNumber: string;

  @IsString()
  @IsNotEmpty()
  streetName: string;

  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsOptional()
  country: string;

  @IsNumber()
  @IsOptional()
  latitude: number;

  @IsNumber()
  @IsOptional()
  longitude: number;
}

export class GetMapAddressesDto {
  @IsString()
  @IsNotEmpty()
  minLat: string;

  @IsString()
  @IsNotEmpty()
  maxLat: string;

  @IsString()
  @IsNotEmpty()
  minLng: string;

  @IsString()
  @IsNotEmpty()
  maxLng: string;
}
