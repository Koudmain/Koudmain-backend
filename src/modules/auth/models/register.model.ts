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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@/modules/users/models/user.model';
import { CreateAddressDto } from '@/modules/address/address.dto';

export enum OwnerPosition {
  OWNER = 'OWNER',
  DIRECTOR = 'DIRECTOR',
  MANAGER = 'MANAGER',
  HR = 'HR',
  OTHER = 'OTHER',
}

export enum CompanyType {
  CAFE_BAR = 'Café / Bar',
  RESTAURANT = 'Restaurant',
  HOTEL = 'Hôtel',
  FAST_FOOD = 'Restauration rapide',
  CATERING_EVENT = 'Traiteur / Event',
  OTHER_CHR = 'Autre CHR',
}

export class WorkerProfileDto {
  @ApiProperty({
    example: [1, 2],
    description: 'IDs des catégories de compétences',
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1)
  @IsNotEmpty()
  skillCategoryIds: number[];

  @ApiPropertyOptional({
    example: "Serveur dynamique avec 3 ans d'expérience.",
    description: 'Courte biographie',
  })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: 25, description: 'Rayon de recherche de travail en km' })
  @IsInt()
  @Min(1)
  @Max(500)
  @IsOptional()
  workRadius?: number;

  @ApiPropertyOptional({
    type: () => CreateAddressDto,
    description: 'Adresse géographique du travailleur',
  })
  @ValidateNested()
  @Type(() => CreateAddressDto)
  @IsOptional()
  address?: CreateAddressDto;
}

export class EmployerProfileDto {
  @ApiProperty({ example: 'Le Petit Bistro', description: "Nom de l'entreprise" })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({
    enum: CompanyType,
    example: CompanyType.RESTAURANT,
    description: "Type d'établissement CHR",
  })
  @IsEnum(CompanyType)
  @IsNotEmpty()
  companyType: CompanyType;

  @ApiProperty({
    enum: OwnerPosition,
    example: OwnerPosition.OWNER,
    description: 'Poste du responsable',
  })
  @IsEnum(OwnerPosition)
  @IsNotEmpty()
  ownerPosition: OwnerPosition;

  @ApiProperty({ example: [1, 3], description: 'IDs des métiers recherchés', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1)
  desiredJobIds: number[];

  @ApiPropertyOptional({ type: () => CreateAddressDto, description: "Adresse de l'entreprise" })
  @ValidateNested()
  @Type(() => CreateAddressDto)
  @IsOptional()
  address?: CreateAddressDto;
}

export class RegisterDto {
  @ApiProperty({ example: 'Alexandre', description: 'Prénom' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Martin', description: 'Nom de famille' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'worker1@koudmain.fr', description: 'Adresse email unique' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Mot de passe (8 caractères min.)' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: '+33612345678', description: 'Numéro de téléphone' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '1995-05-15', description: 'Date de naissance (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  birthDate?: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.WORKER,
    description: 'Rôle (WORKER ou EMPLOYER)',
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  /**
   * @ValidateIf garantit que la validation est ignorée pour les Employers.
   */
  @ApiPropertyOptional({
    type: () => WorkerProfileDto,
    description: 'Profil worker (si role == WORKER)',
  })
  @ValidateIf((o: RegisterDto) => o.role === UserRole.WORKER)
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => WorkerProfileDto)
  workerProfile?: WorkerProfileDto;

  /**
   * @ValidateIf garantit que la validation est ignorée pour les Workers.
   */
  @ApiPropertyOptional({
    type: () => EmployerProfileDto,
    description: 'Profil employeur (si role == EMPLOYER)',
  })
  @ValidateIf((o: RegisterDto) => o.role === UserRole.EMPLOYER)
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => EmployerProfileDto)
  employerProfile?: EmployerProfileDto;
}
