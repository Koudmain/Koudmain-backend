import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { ApplicationStatus } from '@/modules/application/models/application.model';

export class GetApplicationsQueryDto {
  @ApiPropertyOptional({ enum: ApplicationStatus })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({
    description: 'Filtre par publication, requis pour obtenir la remise à zéro du compteur',
    example: 10,
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @IsPositive()
  publicationId?: number;
}
