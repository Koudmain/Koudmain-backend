import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class UpdateCompanyAddressDto {
  @IsString()
  @IsOptional()
  street_number: string;

  @IsString()
  @IsNotEmpty()
  street_name: string;

  @IsString()
  @IsNotEmpty()
  zip_code: string;

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
  street_number: string;

  @IsString()
  @IsNotEmpty()
  street_name: string;

  @IsString()
  @IsNotEmpty()
  zip_code: string;

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
  min_lat: string;

  @IsString()
  @IsNotEmpty()
  max_lat: string;

  @IsString()
  @IsNotEmpty()
  min_lng: string;

  @IsString()
  @IsNotEmpty()
  max_lng: string;

  // @IsString()
  // @IsNotEmpty()
  // lat_delta: string;
}
