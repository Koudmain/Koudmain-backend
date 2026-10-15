import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyType } from '@/modules/auth/models/register.model';

// Envoyé en multipart (avec le logo et la couverture)
export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: 'La Table du Midi' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ enum: CompanyType, example: CompanyType.RESTAURANT })
  @IsOptional()
  @IsEnum(CompanyType)
  companyType?: CompanyType;

  @ApiPropertyOptional({ example: 'Bistrot de quartier, cuisine du marché.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Cuisine française' })
  @IsOptional()
  @IsString()
  specialties?: string;

  @ApiPropertyOptional({ example: 80, description: 'Nombre de couverts (vide pour effacer)' })
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : Number(value)))
  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number | null;

  @ApiPropertyOptional({ example: '5 à 10 personnes' })
  @IsOptional()
  @IsString()
  teamSize?: string;

  @ApiPropertyOptional({ example: true })
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsOptional()
  @IsBoolean()
  mealProvided?: boolean;

  @ApiPropertyOptional({ example: 'Chemise blanche, pantalon noir' })
  @IsOptional()
  @IsString()
  dressCode?: string;
}
