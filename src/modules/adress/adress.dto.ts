// update-company-address.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

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
