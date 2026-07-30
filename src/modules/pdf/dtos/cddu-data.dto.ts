import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsObject, IsString, ValidateNested } from 'class-validator';

export class CdduEmployerDataDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  siret: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  representative: string;
}

export class CdduEmployeeDataDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  nir: string;

  @IsString()
  @IsNotEmpty()
  birthDate: string;

  @IsString()
  @IsNotEmpty()
  address: string;
}

export class CdduContractDataDto {
  @IsString()
  @IsNotEmpty()
  contractRef: string;

  @IsString()
  @IsNotEmpty()
  createdDate: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CdduEmployerDataDto)
  employer: CdduEmployerDataDto;

  @IsObject()
  @ValidateNested()
  @Type(() => CdduEmployeeDataDto)
  employee: CdduEmployeeDataDto;

  @IsString()
  @IsNotEmpty()
  jobTitle: string;

  @IsString()
  @IsNotEmpty()
  missionDescription: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;

  @IsNumber()
  totalHours: number;

  @IsNumber()
  hourlyRate: number;

  @IsNumber()
  totalGrossSalary: number;

  @IsString()
  @IsNotEmpty()
  missionLocation: string;
}

export type CdduContractData = CdduContractDataDto;
