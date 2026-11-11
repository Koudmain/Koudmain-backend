import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ example: 1, description: 'ID de la publication' })
  @IsInt()
  declare publicationId: number;

  @ApiProperty({ example: 42, description: 'ID du travailleur (worker)' })
  @IsInt()
  declare workerId: number;

  @ApiProperty({ example: 10, description: "ID de l'entreprise" })
  @IsInt()
  declare companyId: number;
}
