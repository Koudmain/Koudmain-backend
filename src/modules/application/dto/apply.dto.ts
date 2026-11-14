import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApplyDto {
  @ApiProperty({
    description: 'ID de la publication à laquelle postuler',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  declare publicationId: number;

  @ApiPropertyOptional({
    description:
      "Message d'introduction ou note d'accompagnement pour l'entreprise (150 caractères max)",
    example: 'Bonjour, je suis disponible et intéressé par cette offre.',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'Le message ne doit pas dépasser 150 caractères' })
  declare message?: string;
}
