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
