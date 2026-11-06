import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ example: 1, description: 'ID de la publication' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  publicationId: number;

  @ApiProperty({ example: 42, description: 'ID du profil travailleur (ou ID utilisateur worker)' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  workerId: number;

  @ApiProperty({ example: 10, description: "ID de l'entreprise" })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  companyId: number;
}
