import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApplyDto {
  @ApiProperty({
    description: 'ID de la publication à laquelle postuler',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  declare publicationId: number;

  @ApiPropertyOptional({
    description: "Message d'introduction ou note d'accompagnement pour l'entreprise",
    example: 'Bonjour, je suis disponible et intéressé par cette offre.',
  })
  @IsOptional()
  @IsString()
  declare message?: string;
}
