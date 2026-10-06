import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApplicationStatus } from '../models/application.model';

export class UpdateApplicationStatusDto {
  @ApiProperty({
    description: 'Nouveau statut de la candidature',
    enum: ApplicationStatus,
    example: ApplicationStatus.ACCEPTED,
  })
  @IsEnum(ApplicationStatus)
  @IsNotEmpty()
  declare status: ApplicationStatus;
}
