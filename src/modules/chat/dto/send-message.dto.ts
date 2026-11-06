import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 5, description: 'ID de la conversation' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  conversationId: number;

  @ApiProperty({
    example: 'Bonjour, je suis disponible pour la mission.',
    description: 'Contenu du message',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: 'TEXT', description: 'Type de message', default: 'TEXT' })
  @IsString()
  @IsOptional()
  type?: string;
}
