import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ArrayMinSize,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@/modules/users/models/user.model';
import { CreateAddressDto } from '@/modules/address/address.dto';

export enum OwnerPosition {
  OWNER = 'OWNER',
  DIRECTOR = 'DIRECTOR',
  MANAGER = 'MANAGER',
  HR = 'HR',
  OTHER = 'OTHER',
}

export enum EstablishmentType {
  CAFE_BAR = 'Café / Bar',
  RESTAURANT = 'Restaurant',
  HOTEL = 'Hôtel',
  FAST_FOOD = 'Restauration rapide',
  CATERING_EVENT = 'Traiteur / Event',
  OTHER_CHR = 'Autre CHR',
}

export class WorkerProfileDto {
  @IsInt()
  @IsNotEmpty()
  skill_category_id: number;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsInt()
  @Min(1)
  @Max(500)
  @IsOptional()
  work_radius?: number;

  @ValidateNested()
  @Type(() => CreateAddressDto)
  @IsOptional()
  address?: CreateAddressDto;
}

export class EmployerProfileDto {
  @IsString()
  @IsNotEmpty()
  company_name: string;

  @IsEnum(EstablishmentType)
  @IsNotEmpty()
  establishmentType: EstablishmentType;

  @IsEnum(OwnerPosition)
  @IsNotEmpty()
  owner_position: OwnerPosition;

  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1)
  desired_trade_ids: number[];

  @ValidateNested()
  @Type(() => CreateAddressDto)
  @IsOptional()
  address?: CreateAddressDto;
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @IsString()
  @IsNotEmpty()
  birth_date: string;

  @IsEnum(UserRole)
  role: UserRole;

  /**
   * @ValidateIf garantit que la validation est ignorée pour les Employers.
   */
  @ValidateIf((o: RegisterDto) => o.role === UserRole.WORKER)
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => WorkerProfileDto)
  workerProfile?: WorkerProfileDto;

  /**
   * @ValidateIf garantit que la validation est ignorée pour les Workers.
   */
  @ValidateIf((o: RegisterDto) => o.role === UserRole.EMPLOYER)
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => EmployerProfileDto)
  employerProfile?: EmployerProfileDto;
}
