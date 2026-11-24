import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAddressDto } from '@/modules/address/address.dto';
import { WorkerFormationType } from '@/modules/workers/models/worker-formation.model';

export class WorkerExperienceDto {
  @ApiProperty({ example: 'Serveur en brasserie' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 18, description: 'Durée en mois' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMonths?: number;
}

export class WorkerFormationDto {
  @ApiProperty({ example: 'Permis B' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Lycée hôtelier de Lyon' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  institution?: string;

  @ApiPropertyOptional({ enum: WorkerFormationType })
  @IsOptional()
  @IsEnum(WorkerFormationType)
  type?: WorkerFormationType;

  @ApiPropertyOptional({ example: '2022-01-01' })
  @IsOptional()
  @IsDateString()
  obtainedDate?: string;
}

export class UpdateWorkerProfileDto {
  @ApiPropertyOptional({ example: "Serveur dynamique avec 3 ans d'expérience." })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 25, description: 'Rayon de recherche de travail en km' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  workRadius?: number;

  @ApiPropertyOptional({ example: [1, 2], type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1)
  skillCategoryIds?: number[];

  @ApiPropertyOptional({ type: () => [WorkerExperienceDto], description: 'Remplace la liste' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkerExperienceDto)
  experiences?: WorkerExperienceDto[];

  @ApiPropertyOptional({ type: () => [WorkerFormationDto], description: 'Remplace la liste' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkerFormationDto)
  formations?: WorkerFormationDto[];

  @ApiPropertyOptional({ type: () => CreateAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto;
}
